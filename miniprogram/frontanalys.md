# 剑河出行 - 前端项目分析报告

> 生成时间: 2026-06-23 | 工具: CodeGraph AST + 人工审查
> 项目规模: 33 个 TypeScript 文件, 4093 行代码, 25 个页面

---

## 1. 项目结构

```
miniprogram/
├── app.ts / app.json / app.scss          # 应用入口、全局配置
├── utils/
│   ├── api.ts                             # HTTP 请求封装 (api + request)
│   ├── geo.ts                             # 地理计算 (Haversine, 计价)
│   ├── util.ts                            # 日期/数字格式化
│   └── map.js                             # 默认位置常量
├── custom-tab-bar/                        # 自定义底部导航栏
├── components/
│   └── navigation-bar/                    # 自定义导航栏组件
└── pages/                                 # 25 个页面
    ├── login/register/reset-password/     # 认证流程
    ├── choose-role/                       # 角色选择 (乘客/司机)
    ├── index/                             # 乘客首页 (叫车入口)
    ├── search/                            # 地点搜索
    ├── route-plan/                        # 路线规划
    ├── order/                             # 等待接单
    ├── riding/                            # 行程中 (乘客端)
    ├── finish/                            # 行程结束 + 评价
    ├── share-ride/                        # 拼车
    ├── carpool-list/                      # 顺风车列表 (乘客)
    ├── carpool-publish/                   # 发布顺风车 (司机)
    ├── carpool-detail/                    # 顺风车详情
    ├── driver-home/                       # 司机首页 (接单入口)
    ├── driver-detail/                     # 司机订单详情
    ├── driver-verify/                     # 司机资质认证
    ├── admin-verify/                      # 管理员审核
    ├── order-list/                        # 历史订单
    ├── wallet/                            # 钱包
    ├── earnings/                          # 收入统计
    ├── mine/                              # 个人中心
    ├── saved-places/                      # 收藏地址
    ├── settings/help/logs/                # 设置/帮助/日志
```

---

## 2. 核心技术栈

| 层级 | 技术 |
|------|------|
| 框架 | 微信小程序原生 (TypeScript) |
| HTTP | `wx.request` + `request()` 封装 + `api()` 封装 |
| 实时通信 | `wx.connectSocket` (WebSocket) |
| 地图 | `wx.createMapContext` + 腾讯地图 API (后端代理) |
| 认证 | JWT (token 存储于 wx.Storage) |
| 路由 | 微信页面栈 (navigateTo/redirectTo/switchTab/navigateBack) |

---

## 3. 工具模块分析

### 3.1 `utils/api.ts` — HTTP 请求封装

提供两个请求函数:

| 函数 | 签名 | 用途 |
|------|------|------|
| `api(pathOrOptions, opts?)` | → `Promise<APIResponse>` | 统一请求，自动处理错误 toast，用于内部 API 调用 |
| `request(options)` | → `Promise<WechatResponse>` | 直接替代 `wx.request`，返回真实 Promise，自动注入 Authorization |

**关键行为:**
- `api()` 始终 resolve，网络错误返回 `{ code: -1, msg: '网络异常' }`
- `api()` 可通过 `showError: false` 抑制错误 toast
- `api()` 兼容两种调用方式: `api('/path', {method})` 和 `api({url: '/path', showError: false})`
- `request()` 替代 `wx.request`，支持 `.then()` Promise 链和传统 callback 两种模式
- `BASE_URL = 'https://zzggdd.com'`

### 3.2 `utils/geo.ts` — 地理计算

| 函数 | 说明 |
|------|------|
| `haversineKm(lat1, lng1, lat2, lng2)` | Haversine 球面距离 (km) |
| `calcFare(dist)` | 计价公式: 3km 内 8 元, 超出 2 元/km |
| `now()` | 返回当前时间字符串 `HH:MM` |

### 3.3 `utils/util.ts` — 格式化

| 函数 | 说明 |
|------|------|
| `formatTime(date)` | 日期格式化 |
| `formatNumber(n)` | 数字补零 |

### 3.4 `utils/map.js` — 地图常量

```js
DEFAULT_LOCATION = { latitude: 26.5803, longitude: 108.5979 }  // 剑河县默认位置
```

---

## 4. 页面功能详解

### 4.1 认证流程 (login → register → choose-role)

```
login.ts ──┬── register.ts (新用户注册)
           ├── reset-password.ts (密码重置)
           └── choose-role.ts (选择乘客/司机角色)
```

**API 调用:**
- `POST /api/auth/login` — 登录
- `POST /api/auth/register` — 注册
- `POST /api/auth/reset-password` — 重置密码
- `GET /api/verify/status` — (choose-role) 司机认证状态检查

**异常处理:** login/register/reset-password 均已区分 HTTP 状态码 (502/500/503/429) 并给出不同文案。

### 4.2 乘客叫车流程 (index → search → route-plan → order → riding → finish)

```
index.ts (首页)
  ├── search.ts (搜索目的地)
  ├── route-plan.ts (路线规划)
  ├── carpool-list.ts (顺风车匹配)
  └── share-ride.ts (拼车匹配)
       │
       └── order.ts (等待接单, 5s轮询)
            └── riding.ts (行程中, WebSocket)
                 └── finish.ts (结束 + 评价)
```

**index.ts 关键状态:**
- `hasActiveOrder` — 活跃订单悬浮球 (调用 `/api/order/my-orders`)
- `showCallBtns` — 是否显示叫车/顺风车/拼车按钮
- `pickupAddr` — 逆地理编码获取当前位置描述

**API 调用:**
- `GET /api/order/my-orders` — 检查活跃订单
- `GET /api/map/geocoder?lat=&lng=` — 逆地理编码
- `POST /api/order/create` — 创建订单
- `GET /api/map/direction?from=&to=` — 路线规划 (route-plan)
- `GET /api/carpool/search` — 顺风车搜索
- `GET /api/order/share-match` — 拼车匹配

### 4.3 司机接单流程 (driver-home → driver-detail)

```
driver-home.ts (司机首页)
  ├── driver-verify.ts (资质认证)
  ├── carpool-publish.ts (发布顺风车)
  └── driver-detail.ts (订单详情, WebSocket + 位置上报)
```

**driver-home.ts 关键状态:**
- `verifyStatus` — 认证状态 (loading/none/pending/approved/rejected)
- `hasOpenCarpool` — 是否有进行中的顺风车 (悬浮球)
- `activeTab` — 附近订单/我的订单/顺风车 三 Tab

**API 调用:**
- `GET /api/order/pending?lat=&lng=` — 5km 内待接订单 (需传司机位置)
- `GET /api/order/driver-active` — 我的进行中订单
- `GET /api/order/driver-today` — 今日收入统计
- `GET /api/order/driver-rating` — 司机评分
- `POST /api/order/accept/:id` — 接单
- `GET /api/carpool/my-with-orders` — 顺风车列表+关联订单联表
- `POST /api/carpool/publish` — 发布顺风车
- `POST /api/carpool/close/:id` — 关闭/取消顺风车
- `GET /api/verify/status` — 认证状态

**driver-detail.ts WebSocket:**
- 连接: `wss://zzggdd.com/ws?role=driver&orderId=X&token=X`
- 上报位置: 每 3 秒 `{ type: 'location', lat, lng }`
- 状态变更: `{ type: 'status_change', status: 'arrived'|'running'|'completed' }`
- 聊天: `{ type: 'message', text, from: 'driver' }`
- 接收: `driver_location` / `status_change` / `message`

### 4.4 乘客行程页 (riding.ts)

**WebSocket 连接:**
- 连接: `wss://zzggdd.com/ws?role=passenger&orderId=X&token=X`
- 接收: `driver_location` → 更新司机标记; `status_change` → 状态同步; `message` → 聊天

**状态同步:**
- `tripRunning` = true 时隐藏取消/联系/到达三个按钮
- 加载时根据 `order.status` 恢复状态
- 页面隐藏/销毁时自动断开 WebSocket

**重连策略:** 指数退避 `min(2^n * 1000, 15000)` ms

### 4.5 顺风车系统

```
carpool-publish.ts (司机发布)
carpool-list.ts (乘客搜索匹配)
carpool-detail.ts (司机查看详情 + 结束/取消)
```

**后端匹配逻辑:**
1. 查询状态为 `open`、发车时间在未来 24h 内的顺风车
2. 解码路线 polyline (兼容数组和字符串格式)
3. 计算乘客起点/终点到路线的距离
4. 过滤: 两点都 < 5km
5. 按距离和排序

### 4.6 个人中心 (mine.ts)

- 显示用户信息、历史订单
- 司机角色显示认证状态入口
- 支持切换角色

---

## 5. 导航流程

```
app.json 注册 25 个页面，自定义 tabBar 3 项:
  - 首页 (index)     → 乘客叫车
  - 接单 (driver-home) → 司机接单
  - 我的 (mine)       → 个人中心
```

每个页面的 `onShow` 调用 `getTabBar().setData({ selected })` 同步选中状态。

---

## 6. API 调用模式统计

| 调用方式 | 使用场景 | 文件数 |
|----------|---------|--------|
| `api({url, showError})` | 内部 API (不显式错误 toast) | 19 页 |
| `request({url, method, data})` | 替代 wx.request (支持 Promise + callback) | 18 页 |
| `wx.request({})` 直接调用 | 已全部替换为 request() | 0 页 |

---

## 7. WebSocket 架构

```
                    ws.js (Node.js)
                   /              \
   rooms[orderId].passenger    rooms[orderId].driver
        ↑                            ↑
   riding.ts (乘客)           driver-detail.ts (司机)
   wss://zzggdd.com/ws        wss://zzggdd.com/ws
   ?role=passenger            ?role=driver
   &orderId=X                 &orderId=X
   &token=Y                   &token=Y
```

**消息类型:**
| Type | 发送方 | 接收方 | 数据 |
|------|--------|--------|------|
| `location` | 司机 | 乘客 | `{lat, lng}` |
| `status_change` | 司机 | 乘客 | `{status, price}` |
| `message` | 双向 | 双向 | `{text, from}` |

**认证:** JWT 通过 URL 参数传递，连接时验证

**断线重连:** 指数退避 `min(2^n * 1000, 15000)` ms，最多重连 5 次

---

## 8. 已发现问题 & 建议

### 8.1 高优先级

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| 1 | `api()` 与 `request()` 两种封装并存 | 维护成本高，新页面不知道用哪个 | 统一为 `request()` |
| 2 | WebSocket token 明文在 URL 中 | 安全风险 (日志泄露) | 改用首条消息传 token |
| 3 | 部分页面缺少 `.catch()` 或错误处理 | 异常静默失败 | 全局 request 拦截加兜底 |
| 4 | 重复 import (carpool-detail 两次导入 api) | 打包体积 | 合并为一个 import |

### 8.2 中优先级

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| 5 | `any` 类型泛滥 (所有 .ts 文件) | 无类型检查，重构困难 | 逐步定义 API 响应类型 |
| 6 | 页面间大量使用 `getCurrentPages()` 传参 | 耦合度高，不利于维护 | 使用 EventBus 或全局状态 |
| 7 | WebSocket 重连无上限 | 长时间断线会无限重连 | 加最大重连次数限制 |
| 8 | `setData` 未做 diff | 可能引起不必要的渲染 | 封装 `setDataSafe` 做浅比较 |

### 8.3 低优先级

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| 9 | 样式硬编码 (内联 style) | 难以统一修改主题 | 抽取 CSS 变量 |
| 10 | 地图相关参数硬编码 (scale, padding) | 不同屏幕适配差 | 根据屏幕尺寸动态计算 |
| 11 | 没有单元测试 | 回归风险 | 为 utils 模块加测试 |

---

## 9. 架构图

```
┌─────────────────────────────────────────────────┐
│                    app.ts                        │
│  wx.Storage (token, userInfo)                    │
│  wx.cloud.init()                                 │
└─────────────────────────────────────────────────┘
           │
    ┌──────┴──────┐
    │  custom-tab-bar  │  ← 3 Tab: 首页/接单/我的
    └──────┴──────┘
           │
    ┌──────┴──────────────────────┐
    │       25 页面                │
    │  ┌─────────┐  ┌──────────┐  │
    │  │ 乘客流程 │  │ 司机流程  │  │
    │  │ index   │  │driver-home│  │
    │  │ search   │  │driver-detail│
    │  │route-plan│  │carpool-*  │  │
    │  │ order   │  │driver-verify│
    │  │ riding  │  │admin-verify│
    │  │ finish  │  │earnings   │  │
    │  └─────────┘  └──────────┘  │
    └─────────────────────────────┘
           │                │
    ┌──────┴────┐    ┌─────┴──────┐
    │ utils/api │    │ utils/geo  │
    │ utils/map │    │ utils/util │
    └───────────┘    └────────────┘
           │
    ┌──────┴──────┐
    │  后端 API    │  https://zzggdd.com
    │  WebSocket  │  wss://zzggdd.com/ws
    └─────────────┘
```

---

## 10. 文件依赖热力图

```
                 api.ts ──────────────── 被 22 个页面引用
                 geo.ts ──────────────── 被 5 个页面引用
                 map.js ──────────────── 被 2 个页面引用
                 util.ts ─────────────── 被 1 个页面引用
```

所有页面都依赖 `utils/api.ts`，是项目的核心基础设施模块。

---

> 本报告由 CodeGraph AST 分析 + 人工审查生成
