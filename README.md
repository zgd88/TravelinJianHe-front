# 剑河出行 - 微信小程序打车应用

基于微信小程序 + 微信云托管开发的打车小程序，同时支持**乘客端**和**司机端**两种角色。

---

## 技术栈

| 类型 | 技术 |
|------|------|
| 框架 | 微信小程序原生框架 |
| 语言 | TypeScript |
| 样式 | Sass (SCSS) |
| 后端 | 微信云托管 (Cloud Container) |
| 地图 | 腾讯地图 API |
| 实时通信 | WebSocket (云托管 `connectContainer`) |
| 基础库 | 微信 SDK `2.32.3` |
| 渲染 | Skyline 渲染引擎 |

---

## 项目结构

```
Projects/
├── miniprogram/                     # 小程序根目录
│   ├── app.ts                       # 应用入口 (云初始化、登录)
│   ├── app.json                     # 页面注册、TabBar 配置
│   ├── app.scss                     # 全局样式
│   ├── sitemap.json                 # 微信搜索站点地图
│   ├── images/
│   │   └── car-icon.png             # 车辆图标
│   ├── utils/
│   │   ├── util.ts                  # 日期/时间格式化工具
│   │   └── map.js                   # 腾讯地图 Key + 默认坐标
│   ├── components/
│   │   └── navigation-bar/          # 自定义导航栏组件
│   ├── custom-tab-bar/              # 自定义底部 TabBar (角色感知)
│   └── pages/
│       ├── login/                   # 登录页 (手机号+密码)
│       ├── register/                # 注册页
│       ├── choose-role/             # 角色选择 (乘客/司机)
│       ├── index/                   # 乘客首页 - 地图打车
│       ├── search/                  # 目的地搜索 (腾讯地图 API)
│       ├── order/                   # 等待司机接单
│       ├── riding/                  # 行程中 - 实时追踪
│       ├── finish/                  # 行程结束 - 支付/评价
│       ├── driver-home/             # 司机首页 - 待接订单列表
│       ├── driver-detail/           # 司机订单详情 - 导航/操作
│       ├── driver-verify/           # 司机资质认证
│       ├── admin-verify/            # 管理员认证审核
│       ├── reset-password/          # 忘记密码重置
│       ├── mine/                    # 个人中心 - 订单历史
│       └── logs/                    # 启动日志 (调试用)
├── typings/                         # 微信 API 类型定义
├── package.json                     # 依赖: miniprogram-api-typings
├── tsconfig.json                    # TypeScript 配置
├── project.config.json              # 微信开发者工具项目配置
└── project.private.config.json      # 本地私有配置
```

---

## 功能模块

### 1. 用户认证

| 页面 | 功能 |
|------|------|
| `login` | 手机号 + 密码登录，登录后存储 Token 到本地 |
| `register` | 新用户注册 (手机号、密码、确认密码) |
| `choose-role` | 选择身份：乘客 或 司机 |

- 手机号校验：`/^1[3-9]\d{9}$/` (11位手机号)
- 密码要求：6-20位，注册时需包含字母和数字
- 支持"跳过登录"快速进入首页

### 2. 乘客端流程

```
首页选点 → 搜索目的地 → 创建订单 → 等待接单 → 行程中追踪 → 付款评价
```

| 页面 | 功能说明 |
|------|----------|
| `index` | 全屏腾讯地图，拖动地图选上车点，点击"呼叫车辆" |
| `search` | 调用腾讯地图 Place Suggestion API 搜索目的地，含常用地址快捷选择 |
| `order` | 显示等待动画，轮询订单状态 (3秒间隔)，支持取消和开发环境模拟接单 |
| `riding` | 通过 WebSocket 实时接收司机位置并在地图上显示，可联系司机 |
| `finish` | 行程总结，费用明细，星级评价 |

### 3. 司机端流程

```
查看待接订单 → 抢单 → 到达上车点 → 开始行程 → 完成行程
```

| 页面 | 功能说明 |
|------|----------|
| `driver-home` | 展示附近待接订单列表，点击"抢单"接单 |
| `driver-detail` | 地图显示乘客位置，每 3 秒通过 WebSocket 上报自身位置，按状态操作：到达 → 开始 → 完成 |

### 4. 司机认证流程 (新增)

```
进入个人中心 → 切换到司机角色 → 认证检查
  ├─ 未认证 → 跳转认证页 → 填写资料 + 上传证件照 → 提交审核
  ├─ 审核中 → 弹窗提示等待
  ├─ 已通过 → 正常进入司机首页接单
  └─ 已驳回 → 查看原因 → 修改后重新提交
```

**认证资料:** 真实姓名、身份证号、驾驶证号、车牌号、车型、颜色、身份证照片、驾驶证照片

### 5. 个人中心 (`mine`)

- 用户信息展示 (头像、昵称、脱敏手机号)
- 订单统计 (总订单数、总金额、已完成数)
- 历史订单列表 (各状态颜色标记)
- 角色切换 (乘客 ↔ 司机)
- 退出登录

---

## 后端 API

所有接口通过微信云托管容器调用 (`wx.cloud.callContainer`)：

### REST 接口

| 端点 | 方法 | 用途 | 调用页面 |
|------|------|------|----------|
| `/api/auth/login` | POST | 用户登录 | login |
| `/api/auth/register` | POST | 用户注册 | register |
| `/api/order/create` | POST | 创建打车订单 | index |
| `/api/order/status/:id` | GET | 查询订单状态 | order, driver-detail |
| `/api/order/accept/:id` | POST | 司机接单 | driver-home, order |
| `/api/order/arrive/:id` | POST | 司机到达上车点 | driver-detail |
| `/api/order/start/:id` | POST | 开始行程 | driver-detail |
| `/api/order/complete/:id` | POST | 完成行程 | driver-detail |
| `/api/order/pending` | GET | 获取待接订单列表 | driver-home |
| `/api/order/my-orders` | GET | 获取我的订单历史 | mine |
| `/api/verify/submit` | POST | 提交司机认证资料 | driver-verify |
| `/api/verify/status` | GET | 查询认证状态 | choose-role, driver-home, mine |

### WebSocket

| 路径 | 角色 | 用途 |
|------|------|------|
| `/ws?role=passenger&orderId=:id` | 乘客 | 接收司机实时位置推送 |
| `/ws?role=driver&orderId=:id` | 司机 | 每 3 秒上报自身位置 |

### 腾讯地图 API

- **Place Suggestion**：`https://apis.map.qq.com/ws/place/v1/suggestion` — 目的地模糊搜索
- **API Key**：配置在 `utils/map.js`

---

## 订单状态流转

```
pending (待接单)
  → accepted (已接单)
    → arrived (已到达上车点)
      → running (行程中)
        → completed (已完成)
  → cancelled (已取消)
```

---

## 云环境配置

| 配置项 | 值 |
|--------|-----|
| 云环境 ID | `prod-d9gwk85xd3e015347` |
| 服务名称 | `travel-service` |
| AppID | `wx94080e619049f083` |
| 默认坐标 | 成都天府广场 (30.6598, 104.0634) |

---

## 本地开发

### 环境要求

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) (推荐最新版)
- Node.js (仅用于 TypeScript 类型安装)

### 启动步骤

1. 克隆项目到本地
2. 安装依赖：
   ```bash
   npm install
   ```
3. 使用微信开发者工具打开项目根目录
4. 工具将自动识别 `project.config.json` 中的配置
5. 编译运行即可预览

### 配置说明

- **TypeScript**：通过微信编译器插件自动编译，无需额外构建
- **Sass**：同样通过编译器插件处理，`.scss` 文件自动编译为 `.wxss`
- 如需修改 AppID 或云环境，请编辑 `project.config.json` 和 `app.ts`

---

## 重要说明

1. **后端依赖**：本项目仅为小程序前端，需要配合微信云托管后端服务使用
2. **模拟数据**：`order` 页包含开发环境"模拟接单"按钮，方便没有司机端时测试完整流程
3. **WebSocket**：实时位置共享依赖云托管 `connectContainer` 能力
4. **地图坐标**：默认坐标为成都市范围，可根据业务需求修改 `utils/map.js` 中的 `DEFAULT_LOCATION`
5. **角色路由**：TabBar 根据 `localStorage` 中的 `role` 字段动态展示不同菜单
"# TravelinJianHe-front" 
