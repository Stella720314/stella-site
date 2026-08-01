/* data.js — 节气 / 节假日静态数据 + 示例内容（新闻、歌曲）
   说明：节假日与调休为 2026 年常用安排，可在日历中手动增删改。 */
(function () {
  window.App = window.App || {};
  const App = window.App;

  /* ---------- 二十四节气 2026 ---------- */
  const SOLAR_TERMS = {
    "2026-01-05":"小寒","2026-01-20":"大寒","2026-02-04":"立春","2026-02-18":"雨水",
    "2026-03-05":"惊蛰","2026-03-20":"春分","2026-04-05":"清明","2026-04-20":"谷雨",
    "2026-05-05":"立夏","2026-05-21":"小满","2026-06-05":"芒种","2026-06-21":"夏至",
    "2026-07-07":"小暑","2026-07-22":"大暑","2026-08-07":"立秋","2026-08-23":"处暑",
    "2026-09-07":"白露","2026-09-23":"秋分","2026-10-08":"寒露","2026-10-23":"霜降",
    "2026-11-07":"立冬","2026-11-22":"小雪","2026-12-07":"大雪","2026-12-22":"冬至"
  };

  /* ---------- 法定节假日 / 调休（2026） ---------- */
  const HOLIDAY_RANGES = [
    { name: "元旦", dates: ["2026-01-01"] },
    { name: "春节", dates: ["2026-02-16","2026-02-17","2026-02-18","2026-02-19","2026-02-20","2026-02-21","2026-02-22"] },
    { name: "清明", dates: ["2026-04-04","2026-04-05","2026-04-06"] },
    { name: "劳动节", dates: ["2026-05-01","2026-05-02","2026-05-03","2026-05-04","2026-05-05"] },
    { name: "端午", dates: ["2026-06-19","2026-06-20","2026-06-21"] },
    { name: "中秋", dates: ["2026-09-25","2026-09-26","2026-09-27"] },
    { name: "国庆", dates: ["2026-10-01","2026-10-02","2026-10-03","2026-10-04","2026-10-05","2026-10-06","2026-10-07"] }
  ];
  const MAKEUP = ["2026-02-14","2026-02-28","2026-05-09","2026-10-10"]; // 调休上班日

  const holidayMap = {}; // date -> {name, type}
  HOLIDAY_RANGES.forEach(h => h.dates.forEach(d => holidayMap[d] = { name: h.name, type: "holiday" }));
  MAKEUP.forEach(d => holidayMap[d] = { name: "调休班", type: "makeup" });

  App.calendarMeta = {
    term(date) { return SOLAR_TERMS[date] || null; },
    holiday(date) { return holidayMap[date] || null; }
  };

  /* ---------- 每日新闻库（含时间/来源链接/视频链接/博主解读/热门搜索） ---------- */
  App.NEWS_DB = {
    "2026-07-29": {
      hot: ["AI 算力新政", "暑期文旅消费", "医保跨省结算", "应届生就业", "台风蓝色预警", "国产大模型开源"],
      domestic: [
        { id:"d1", time:"07:30", title:"上半年国民经济运行数据发布，新动能持续壮大",
          body:"国家统计局公布数据显示，上半年国内生产总值同比增长保持稳健，居民消费价格总体平稳。高技术制造业、新能源汽车、智能装备等新动能产业贡献持续提升，服务业增加值占 GDP 比重继续上升。",
          source:"新华社", sourceUrl:"https://www.news.cn",
          bloggers:[
            {name:"财经观察猿",type:"财经",text:"数据符合‘稳中求进’基调，结构亮点在高技术制造与服务业；关注下半年消费修复的可持续性，以及出口链的外需扰动。"},
            {name:"宏观小李",type:"财经",text:"我的启发：把‘新动能’拆成可跟踪的细分赛道（储能、半导体设备、创新药），比泛泛看指数更有抓手。"}] },
        { id:"d2", time:"08:05", title:"多地推进暑期文旅消费季，夜经济带动本地生活回暖",
          body:"多个省市推出夜经济、文博联票、演艺门票补贴等促消费举措，带动餐饮、住宿、出行产业链明显回暖。平台数据显示，博物馆与演唱会周边订单同比增长显著。",
          source:"人民日报", sourceUrl:"https://www.people.com.cn",
          bloggers:[
            {name:"城市记录者",type:"生活",text:"文旅的‘情绪价值’被放大了：人们愿意为体验而非实物买单。对内容创作者而言，本地小众路线是红利。"},
            {name:"消费研究员",type:"财经",text:"留意‘补贴退坡’后的留存率，真需求还是价格敏感？这是判断板块景气的关键。"}] },
        { id:"d3", time:"09:20", title:"医保跨省直接结算覆盖范围再扩大",
          body:"国家医保局宣布，门诊慢特病跨省直接结算病种进一步扩围，异地就医备案流程简化。多地已上线‘一键备案’，惠及随迁老人与异地务工人员。",
          source:"央视新闻", sourceUrl:"https://news.cctv.com",
          bloggers:[
            {name:"民生观察",type:"社会",text:"这是‘看不见但很贵’的民生改善，直接降低患者垫资与跑腿成本；对家庭财务规划也是减负。"}] },
        { id:"d4", time:"10:40", title:"国产开源大模型发布新版本，推理成本大幅下降",
          body:"国内团队发布新一代开源大语言模型，在多项中文基准上表现接近主流闭源模型，且推理显存占用显著降低，个人开发者可在消费级显卡部署。",
          source:"36氪", sourceUrl:"https://36kr.com", videoUrl:"https://www.douyin.com/",
          bloggers:[
            {name:"AI炼丹师",type:"科技",text:"成本下探会是应用爆发的临界点——中小团队终于能‘玩得起’了。建议关注端侧+工作流的结合。"},
            {name:"产品阿May",type:"科技",text:"启发：把‘模型能力’翻译成‘用户省下的时间’，才是产品价值，而不是堆参数。"}] }
      ],
      global: [
        { id:"g1", time:"06:50", title:"主要经济体央行议息窗口临近，市场关注利率路径",
          body:"本周多家主要央行将公布利率决议，市场关注其对后续降息节奏的表态。汇率与大宗商品价格波动加大，避险资产需求上升。",
          source:"Reuters", sourceUrl:"https://www.reuters.com",
          bloggers:[
            {name:"GlobalMacro",type:"财经",text:"预期管理比数字本身更重要，关注‘点阵图’与措辞微调；控制久期与杠杆，别赌单边。"}] },
        { id:"g2", time:"07:45", title:"人工智能基础设施投资继续升温，电力配套成瓶颈",
          body:"海外云厂商上调资本开支指引，算力与电力配套成为新一轮投资主线。部分地区因电网容量限制，数据中心建设进度受影响。",
          source:"Bloomberg", sourceUrl:"https://www.bloomberg.com",
          bloggers:[
            {name:"算力老王",type:"科技",text:"AI 的‘卖水人’逻辑没变：电力、液冷、光模块。瓶颈在哪，机会就在哪。"}] },
        { id:"g3", time:"09:10", title:"欧盟发布数字市场新规草案，强调互操作与数据可携带",
          body:"针对大型平台的反垄断监管进一步细化，要求开放互操作接口、保障用户数据可携带，合规成本上升引发行业讨论。",
          source:"Financial Times", sourceUrl:"https://www.ft.com",
          bloggers:[
            {name:"合规笔记",type:"财经",text:"平台型企业要重新审视生态策略，‘围墙花园’模式成本越来越高，开放未必是坏事。"}] },
        { id:"g4", time:"11:15", title:"全球粮食价格指数小幅回落，极端天气仍是变量",
          body:"受主要产区丰收预期影响，国际粮价结束连续上涨。分析人士提醒，气候异常与地缘冲突仍可能扰动供给。",
          source:"Reuters", sourceUrl:"https://www.reuters.com",
          bloggers:[
            {name:"农业观察",type:"财经",text:"输入型通胀压力缓和利好下游食品企业，但别把‘丰年’当‘永远’，天气期权值得研究。"}] }
      ]
    },
    "2026-07-28": {
      hot: ["新能源汽车下乡", "夏季用电高峰", "数字人民币试点", "半导体国产化"],
      domestic: [
        { id:"d1", time:"08:00", title:"新能源汽车下乡活动启动，配套充电网络同步落地",
          body:"多部门联合推动新能源汽车下沉市场普及，购车补贴与县域充电桩建设同步推进，覆盖百余个县市。",
          source:"央视新闻", sourceUrl:"https://news.cctv.com",
          bloggers:[{name:"出行研究",type:"财经",text:"下沉市场是增量主战场，关注充电桩运营与后市场服务的盈利模型。"}] },
        { id:"d2", time:"09:30", title:"夏季用电高峰平稳度过，绿电消纳能力增强",
          body:"电网负荷创历史新高但供应总体平稳，风光发电占比持续提升，储能调峰作用凸显。",
          source:"人民日报", sourceUrl:"https://www.people.com.cn",
          bloggers:[{name:"能源观察",type:"财经",text:"‘源网荷储’一体化是趋势，储能从‘哑设备’变成‘调节资源’。"},
                    {name:"低碳生活",type:"生活",text:"个人也能参与：错峰用电、选绿电套餐，积少成多。"}] },
        { id:"d3", time:"10:20", title:"数字人民币试点场景再扩容",
          body:"多地扩大数字人民币在政务缴费、商圈消费、薪资发放等场景的试点，离线支付能力优化。",
          source:"新华社", sourceUrl:"https://www.news.cn",
          bloggers:[{name:"支付观察者",type:"财经",text:"试点到规模化之间差的是‘真实高频场景’，别只看技术。"}] }
      ],
      global: [
        { id:"g1", time:"07:20", title:"欧盟碳边境调节机制进入实质执行阶段",
          body:"发达经济体加速碳关税立法落地，高耗能出口企业面临合规成本上升。",
          source:"Financial Times", sourceUrl:"https://www.ft.com",
          bloggers:[{name:"ESG前沿",type:"财经",text:"出口企业需提前做碳足迹核算，低碳转型从‘加分项’变‘入场券’。"},
                    {name:"制造老王",type:"社会",text:"倒逼供应链升级，短期疼，长期强。"}] },
        { id:"g2", time:"08:40", title:"国际海运运力恢复，亚欧航线运价下行",
          body:"集装箱运力恢复叠加需求走弱，亚欧航线运价较年初明显回落，利好外贸库存周转。",
          source:"Bloomberg", sourceUrl:"https://www.bloomberg.com",
          bloggers:[{name:"贸易观察",type:"财经",text:"运费是外贸的‘体温计’，回落释放成本端利好。"}] },
        { id:"g3", time:"10:05", title:"国际科研合作论坛召开，聚焦气候与公共卫生",
          body:"多国科学家围绕气候变化与公共卫生展开跨领域协作，呼吁加强数据共享。",
          source:"AP", sourceUrl:"https://apnews.com",
          bloggers:[{name:"科学传播",type:"科技",text:"跨界协作是破解复杂问题的钥匙，开放数据文化很重要。"}] }
      ]
    },
    "2026-07-27": {
      hot: ["暑期档票房", "城市更新", "青年就业", "低空经济"],
      domestic: [
        { id:"d1", time:"08:15", title:"暑期档电影票房创新高，内容供给质量提升",
          body:"多部国产影片带动观影热情，暑期档总票房突破去年同期水平，院线与非票收入同步增长。",
          source:"新华社", sourceUrl:"https://www.news.cn", videoUrl:"https://www.xiaohongshu.com/",
          bloggers:[{name:"影评小鹿",type:"生活",text:"好内容自带传播，口碑发酵比硬广更值钱；对做内容的人是鼓励。"},
                    {name:"传媒研究",type:"财经",text:"票房是消费信心的温度计，关注影视院线链的恢复弹性。"}] },
        { id:"d2", time:"09:00", title:"城市更新行动推进，老旧小区适老化改造提速",
          body:"老旧小区改造与社区适老化建设成为民生重点工程，加装电梯、社区食堂等配套落地。",
          source:"人民日报", sourceUrl:"https://www.people.com.cn",
          bloggers:[{name:"城市笔记",type:"社会",text:"‘适老化’是长期刚需，银发经济不止于医疗。"}] },
        { id:"d3", time:"10:30", title:"低空经济试点扩围，无人机物流进入常态化",
          body:"多个城市获批低空物流航线，外卖、急救物资配送开始规模化试运行。",
          source:"央视新闻", sourceUrl:"https://news.cctv.com",
          bloggers:[{name:"低空探索",type:"科技",text:"‘最后一公里’被重写，监管与空域是真正门槛。"}] }
      ],
      global: [
        { id:"g1", time:"07:30", title:"海外云厂商上调资本开支，AI 算力军备赛延续",
          body:"主要云厂商最新指引显示，AI 相关资本开支继续高增，带动上游芯片与电力需求。",
          source:"Reuters", sourceUrl:"https://www.reuters.com",
          bloggers:[{name:"半导体控",type:"科技",text:"算力需求确定性强，但估值已高，买在分歧、卖在一致。"}] },
        { id:"g2", time:"09:10", title:"多国推进数据跨境流动规则协调",
          body:"主要经济体就数据跨境流动展开磋商，试图在监管与贸易便利化间取得平衡。",
          source:"AP", sourceUrl:"https://apnews.com",
          bloggers:[{name:"数字治理",type:"财经",text:"数据‘流动性’将成新型贸易壁垒或红利，企业合规要前置。"}] }
      ]
    }
  };
  // 实时刷新时追加的「更多」缓冲（模拟持续更新）
  App.NEWS_MORE = {
    "2026-07-29": [
      { id:"d5", time:"11:50", title:"多地发布高温健康提示，户外作业时段调整",
        body:"气象部门连续发布高温预警，多地调整户外施工与外卖配送时段，开放避暑纳凉点。",
        source:"中国天气", sourceUrl:"http://www.weather.com.cn",
        bloggers:[{name:"生活小贴士",type:"生活",text:"把‘防暑’纳入日常节律：补水、错峰、关注老人儿童，比事后补救强。"}] },
      { id:"d6", time:"12:10", title:"高校开设 AI 素养通识课，覆盖新生",
        body:"多所高校将人工智能素养纳入新生通识教育，内容包括提示词工程、AI 伦理与信息甄别。",
        source:"教育在线", sourceUrl:"http://www.eol.cn",
        bloggers:[{name:"教育观察",type:"社会",text:"AI 素养会和‘读写’一样成为基础能力，越早建立判断力越好。"}] }
    ]
  };
  App.newsFor = function (dateKey) {
    if (App.NEWS_DB[dateKey]) return App.NEWS_DB[dateKey];
    // 没有该日数据时，回退到最近一个有数据的日期
    const keys = Object.keys(App.NEWS_DB).sort().reverse();
    return App.NEWS_DB[keys[0]];
  };
  App.newsHot = function (dateKey) { return (App.NEWS_DB[dateKey] && App.NEWS_DB[dateKey].hot) || []; };
  App.newsMore = function (dateKey) { return App.NEWS_MORE[dateKey] || []; };

})();
