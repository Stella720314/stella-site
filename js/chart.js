/* chart.js — 轻量 SVG 图表（折线 / 柱状），无第三方依赖 */
(function () {
  window.App = window.App || {};
  const SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* 生成不重复的整数 nice ticks */
  function niceIntTicks(min, max, count) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    const rawStep = span / (count - 1);
    const pow10 = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const frac = rawStep / pow10;
    let step = pow10;
    if (frac > 5) step *= 10;
    else if (frac > 2) step *= 5;
    else if (frac > 1) step *= 2;
    step = Math.max(1, Math.round(step)); // 整数刻度
    let tmin = Math.floor(min / step) * step;
    let tmax = Math.ceil(max / step) * step;
    while ((tmax - tmin) / step + 1 < count) {
      if (Math.abs(tmin - min) > Math.abs(tmax - max)) tmax += step; else tmin -= step;
    }
    const ticks = [];
    for (let v = tmin; v <= tmax + 0.001; v += step) ticks.push(v);
    if (ticks.length > count) {
      const extra = ticks.length - count;
      const start = Math.floor(extra / 2);
      ticks = ticks.slice(start, start + count);
    }
    return ticks;
  }

  /* 折线图：data=[{label,value}], opts={unit,height} */
  App.lineChart = function (container, data, opts = {}) {
    container.innerHTML = "";
    const W = 520, H = opts.height || 220, padL = 38, padR = 16, padT = 16, padB = 28;
    if (!data.length) { container.innerHTML = `<div class="empty">暂无数据，记录后将自动生成趋势图 📈</div>`; return; }
    const vals = data.map(d => d.value);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= 1; max += 1; }
    const span = (max - min) || 1;
    min -= span * 0.1; max += span * 0.1;
    const iw = W - padL - padR, ih = H - padT - padB;
    const x = i => padL + (data.length === 1 ? iw / 2 : iw * i / (data.length - 1));
    const yTicks = niceIntTicks(min, max, 5);
    const yMin = yTicks[0], yMax = yTicks[yTicks.length - 1];
    const y = v => padT + ih - (v - yMin) / (yMax - yMin) * ih;

    const svg = el("svg", { class: "chart-svg", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });
    // 横向网格 + Y 轴标签
    yTicks.forEach(tv => {
      const gy = y(tv);
      svg.appendChild(el("line", { class: "axis", x1: padL, y1: gy, x2: W - padR, y2: gy, "stroke-dasharray": "3 4" }));
      const tx = el("text", { x: 4, y: gy + 3 }); tx.textContent = tv; svg.appendChild(tx);
    });
    // 区域
    let area = `M ${x(0)} ${y(data[0].value)}`;
    data.forEach((d, i) => area += ` L ${x(i)} ${y(d.value)}`);
    area += ` L ${x(data.length - 1)} ${padT + ih} L ${x(0)} ${padT + ih} Z`;
    svg.appendChild(el("path", { class: "area", d: area }));
    // 折线
    let line = "";
    data.forEach((d, i) => line += (i ? " L " : "M ") + x(i) + " " + y(d.value));
    svg.appendChild(el("path", { class: "line", d: line }));
    // 点
    data.forEach((d, i) => {
      const c = el("circle", { class: "pt", cx: x(i), cy: y(d.value), r: 3.5 });
      const t = el("title"); t.textContent = `${d.label}: ${d.value}${opts.unit || ""}`; c.appendChild(t);
      svg.appendChild(c);
      if (i % Math.ceil(data.length / 8 || 1) === 0 || data.length <= 8) {
        const lt = el("text", { x: x(i), y: H - 10, "text-anchor": "middle" }); lt.textContent = d.label; svg.appendChild(lt);
      }
    });
    container.appendChild(svg);
  };

  /* 柱状图：data=[{label,value}]，负值标红 */
  App.barChart = function (container, data, opts = {}) {
    container.innerHTML = "";
    const W = 560, H = opts.height || 240, padL = 40, padR = 12, padT = 16, padB = 34;
    if (!data.length) { container.innerHTML = `<div class="empty">暂无数据</div>`; return; }
    const vals = data.map(d => d.value);
    let max = Math.max(...vals, 0), min = Math.min(...vals, 0);
    if (opts.ymax != null) max = opts.ymax; else { max = max === 0 ? 1 : max; }
    if (opts.ymin != null) min = opts.ymin; else { min = min === 0 ? -1 : min; }
    const iw = W - padL - padR, ih = H - padT - padB;
    const zeroY = padT + ih - (0 - min) / (max - min) * ih;
    const bw = iw / data.length * 0.55;

    const svg = el("svg", { class: "chart-svg", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });
    svg.appendChild(el("line", { class: "axis", x1: padL, y1: zeroY, x2: W - padR, y2: zeroY }));
    data.forEach((d, i) => {
      const cx = padL + iw * (i + 0.5) / data.length;
      const v = d.value;
      const yTop = v >= 0 ? padT + ih - (v - min) / (max - min) * ih : zeroY;
      const h = Math.abs((v >= 0 ? zeroY : padT + ih - (v - min) / (max - min) * ih) - zeroY);
      const r = el("rect", { class: "bar" + (v < 0 ? " neg" : ""), x: cx - bw / 2, y: yTop, width: bw, height: Math.max(1, h), rx: 5 });
      const t = el("title"); t.textContent = `${d.label}: ${v}`; r.appendChild(t); svg.appendChild(r);
      const vt = el("text", { x: cx, y: v >= 0 ? yTop - 4 : yTop + h + 12, "text-anchor": "middle" }); vt.textContent = v; svg.appendChild(vt);
      if (i % Math.ceil(data.length / 10 || 1) === 0 || data.length <= 10) {
        const lt = el("text", { x: cx, y: H - 14, "text-anchor": "middle" }); lt.textContent = d.label; svg.appendChild(lt);
      }
    });
    // Y 轴刻度
    [max, 0, min].forEach(v => {
      const gy = padT + ih - (v - min) / (max - min) * ih;
      const tx = el("text", { x: 4, y: gy + 3 }); tx.textContent = v; svg.appendChild(tx);
    });
    container.appendChild(svg);
  };

  /* 多序列折线图：series=[{name,color,data:[{label,value}]}]，opts={unit,height} */
  App.multiLineChart = function (container, series, opts = {}) {
    container.innerHTML = "";
    const allPts = series.flatMap(s => s.data);
    if (!allPts.length) { container.innerHTML = `<div class="empty">暂无数据，记录后将自动生成趋势图 📈</div>`; return; }
    const W = 540, H = opts.height || 240, padL = 40, padR = 16, padT = 16, padB = 30;
    const vals = allPts.map(d => d.value);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= 1; max += 1; }
    const span = (max - min) || 1;
    min -= span * 0.12; max += span * 0.12;
    const iw = W - padL - padR, ih = H - padT - padB;
    const totalN = Math.max(...series.map(s => s.data.length));
    const x = i => padL + (totalN === 1 ? iw / 2 : iw * i / (totalN - 1));
    const yTicks = niceIntTicks(min, max, 5);
    const yMin = yTicks[0], yMax = yTicks[yTicks.length - 1];
    const y = v => padT + ih - (v - yMin) / (yMax - yMin) * ih;

    const legend = document.createElement("div");
    legend.style.cssText = "display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px;font-size:12px;color:var(--text-2)";
    legend.innerHTML = series.map(s => `<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:14px;height:4px;border-radius:3px;display:inline-block;background:${s.color}"></i>${s.name}</span>`).join("");
    container.appendChild(legend);

    const svg = el("svg", { class: "chart-svg", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });
    yTicks.forEach(tv => {
      const gy = y(tv);
      svg.appendChild(el("line", { class: "axis", x1: padL, y1: gy, x2: W - padR, y2: gy, "stroke-dasharray": "3 4" }));
      const tx = el("text", { x: 4, y: gy + 3 }); tx.textContent = tv; svg.appendChild(tx);
    });
    series.forEach(s => {
      if (s.data.length) {
        let line = "", area = `M ${x(0)} ${y(s.data[0].value)}`;
        s.data.forEach((d, i) => { line += (i ? " L " : "M ") + x(i) + " " + y(d.value); area += ` L ${x(i)} ${y(d.value)}`; });
        area += ` L ${x(s.data.length - 1)} ${padT + ih} L ${x(0)} ${padT + ih} Z`;
        svg.appendChild(el("path", { d: area, fill: s.color, opacity: 0.10 }));
        svg.appendChild(el("path", { d: line, fill: "none", stroke: s.color, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      }
      s.data.forEach((d, i) => {
        const c = el("circle", { cx: x(i), cy: y(d.value), r: 3.2, fill: s.color, stroke: "var(--card-bg)", "stroke-width": 2, style: "cursor:pointer" });
        const t = el("title"); t.textContent = `${d.label} · ${s.name}: ${d.value}${opts.unit || ""}`; c.appendChild(t);
        svg.appendChild(c);
        if (i % Math.ceil(s.data.length / 8 || 1) === 0 || s.data.length <= 8) {
          const lt = el("text", { x: x(i), y: H - 10, "text-anchor": "middle" }); lt.textContent = d.label; svg.appendChild(lt);
        }
      });
    });
    container.appendChild(svg);
  };
})();
