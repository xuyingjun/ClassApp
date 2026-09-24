# 今日课程卡片多状态记课优化

## Context（背景与目标）

首页「今日课程」卡片 [TodayClassCard.tsx](file:///c:/Users/Admin/Desktop/ClassApp/src/components/course/TodayClassCard.tsx) 无记录时只有一个「✓ 上完课」按钮，调用 [recordLesson](file:///c:/Users/Admin/Desktop/ClassApp/src/services/classRecordService.ts#L46-L50)（固定 `completed`）。今天排了课但实际「请假/缺席/取消/补课」时，用户得走「首页补录+ → /records → ＋补录 → RecordForm」3 步，体验偏长。

目标：保持「5 秒记一节」核心价值（完成仍一键）的前提下，在卡片上直接选其他状态。

服务层已就绪：[addClassRecord](file:///c:/Users/Admin/Desktop/ClassApp/src/services/classRecordService.ts#L54-L77) 完整支持任意 `status`（含 ownership 校验、查重、事务、`afterRecordChange` 重算课时）。**本次不改服务层**，只动卡片组件。

## 交互方向（用户已确认）

- 触发方式：**主按钮 + 次按钮**。保留「✓ 上完课」一键完成，加一个 ghost 次按钮触发其他状态。
- 选择器：**轻量四选一**。BottomSheet 内放 完成/补课/取消/缺席 4 个按钮，点一下即记录并关闭。

## 实施步骤（仅改 1 个文件）

文件：[src/components/course/TodayClassCard.tsx](file:///c:/Users/Admin/Desktop/ClassApp/src/components/course/TodayClassCard.tsx)

### 1. 新增 import

- 从 `../../services/classRecordService` 额外引入 `addClassRecord` 和类型 `ClassRecordStatus`（`recordLesson`、`DuplicateRecordError` 保留）。
- 引入 `BottomSheet`（`../ui/BottomSheet`）和 `RECORD_STATUS_META`（`../../constants`）。

### 2. 新增组件状态

- `sheetOpen: boolean`（控制选择器）。`busy` 已存在，复用。

### 3. 无记录时的布局（替换当前 L74-L78 单一 Button）

```
[ 时间 ] [ 课程+老师 ] [ ✓ 上完课 | 其他状态▾ ]
                       primary    ghost→打开sheet
```

- 主按钮「✓ 上完课」：**行为不变**，仍调 `recordLesson(...)`，保持一键完成。
- 次按钮（ghost variant，文案「其他状态」或「请假·取消」）：仅 `setSheetOpen(true)`。
- 两个按钮包在 `flex shrink-0 items-center gap-1.5` 内；手机宽度紧张时次按钮可缩为图标式（实现时按实测调整）。
- 有记录时：保持现状（显示状态徽章），不改。

### 4. 新增选择器提交函数 `submit(status: ClassRecordStatus)`

统一走 `addClassRecord`（不动 `recordLesson` 签名）：

```ts
const submit = async (status: ClassRecordStatus) => {
  if (busy) return
  setBusy(true)
  try {
    await addClassRecord({
      childId: course.childId,
      courseId: course.id,
      date: todayStr(),
      startTime,
      endTime,
      status,
      lessonCount: 1,
    })
    const updated = await db.courses.get(course.id)
    const left = updated ? remainingLessons(updated) : null
    const counted = status === 'completed' || status === 'makeup'
    toast.showToast(left !== null && counted ? `已记录，剩 ${left} 节` : '已记录 ✓', 'success')
    setSheetOpen(false)
  } catch (err) {
    if (err instanceof DuplicateRecordError) toast.showToast(err.message, 'error')
    else toast.showToast('保存失败，请重试', 'error')
  } finally {
    setBusy(false)
  }
}
```

> 说明：主按钮「✓ 上完课」也可改为调 `submit('completed')`，与选择器里点「完成」走同一路径，行为等价、代码更统一。实现时统一即可。

### 5. 新增 BottomSheet JSX

```tsx
<BottomSheet open={sheetOpen} title="记一节课" onClose={() => setSheetOpen(false)}>
  {/* 只读摘要：时间 + 课程名，让用户确认在记哪节 */}
  <div className="mb-3 text-sm text-neutral-500">
    {startTime ?? '--:--'}{endTime ? `-${endTime}` : ''} · {course.name}
  </div>
  <div className="grid grid-cols-2 gap-2">
    {(['completed','makeup','cancelled','absent'] as const).map((s) => (
      <button
        key={s}
        disabled={busy}
        onClick={() => void submit(s)}
        className="h-12 rounded-xl text-sm font-medium bg-neutral-100 text-neutral-600 disabled:opacity-50 active:bg-neutral-200"
      >
        {RECORD_STATUS_META[s].label}
      </button>
    ))}
  </div>
</BottomSheet>
```

样式参考 [RecordForm.tsx L142-L159](file:///c:/Users/Admin/Desktop/ClassApp/src/components/record/RecordForm.tsx#L142-L159)，但此处为"点一下即提交"，无选中态。文案与颜色取自 [RECORD_STATUS_META](file:///c:/Users/Admin/Desktop/ClassApp/src/constants/index.ts#L64-L69)。

### 6. 不改动的部分

- 服务层 `recordLesson`/`addClassRecord`/查重/事务：不动。
- `RECORD_STATUS_META`、`ClassRecordStatus`、`isCountedStatus`：直接复用。
- HomePage 的 live query 匹配逻辑、首页「补录+」、RecordListPage、RecordForm：不动。
- 统计、备份、提醒：不动。

提交成功后，[HomePage L49-L87](file:///c:/Users/Admin/Desktop/ClassApp/src/pages/HomePage.tsx#L49-L87) 的 `useMemo` 通过 live query 重新匹配到该 record，卡片自动从「按钮态」切到「徽章态」，无需额外刷新。

## 已知边界（不在本次范围）

- 提交后想改状态，仍到 /records 编辑或删除该记录（现有能力，本次不加卡片内编辑）。
- `cancelled`/`absent` 不计入课时、不触发查重（[assertNoDuplicate](file:///c:/Users/Admin/Desktop/ClassApp/src/services/classRecordService.ts#L31-L43) 仅对 `isCountedStatus` 查重），语义正确。

## 验证

1. `npm run dev`，首页今日课程卡片：
   - 点「✓ 上完课」→ 一键完成，Toast「已记录，剩 N 节」，卡片变「✓ 已完成」徽章。
   - 点「其他状态」→ 弹 BottomSheet，4 个按钮。
   - 依次测 补课/取消/缺席（每次先删当天该时段记录或换课程）→ Toast 提示、卡片徽章颜色文案（绿/蓝/灰/橙）与 RECORD_STATUS_META 一致。
2. 课时校验：补课(completed/makeup) 后课程「已用+1、剩余-1」；取消/缺席后课时不变。课程详情页确认。
3. 查重：同时段连点两次「完成」→ 第二次报「该时段已经记录过了」。
4. 连点防护：busy 期间主按钮 `loading={busy}`，选择器内按钮 `disabled={busy}`。
5. `npm test` 跑 [classRecordService.test.ts](file:///c:/Users/Admin/Desktop/ClassApp/src/services/classRecordService.test.ts)，服务层未改应全绿。
6. `npm run build` 类型检查通过。
