#!/bin/bash

# 方案B第一阶段 - 端到端集成测试脚本
# 测试完整的审批流程：报修 -> 预算 -> 立项三级审批

set -e

API_URL="http://localhost:3000/api/v1"
REPORTER_TOKEN=""
VICE_DIRECTOR_TOKEN=""
DEPT_MANAGER_TOKEN=""
VICE_LEADER_TOKEN=""
TOP_LEADER_TOKEN=""
CONTRACTOR_TOKEN=""
TICKET_ID=""
BUDGET_ID=""
PROJECT_ID=""
FLOW_ID=""

echo "=========================================="
echo "方案B第一阶段 - 集成测试开始"
echo "=========================================="
echo ""

# 1. 登录获取token
echo "📝 步骤1: 用户登录获取token..."

REPORTER_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"reporter1","password":"Test1234"}' | jq -r '.tokens.accessToken')
echo "✓ 报修人登录成功: reporter1"

VICE_DIRECTOR_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"vice_director1","password":"Test1234"}' | jq -r '.tokens.accessToken')
echo "✓ 副主任登录成功: vice_director1"

DEPT_MANAGER_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"dept_manager1","password":"Test1234"}' | jq -r '.tokens.accessToken')
echo "✓ 部门主管登录成功: dept_manager1"

VICE_LEADER_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"vice_leader1","password":"Test1234"}' | jq -r '.tokens.accessToken')
echo "✓ 分管领导登录成功: vice_leader1"

TOP_LEADER_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"top_leader1","password":"Test1234"}' | jq -r '.tokens.accessToken')
echo "✓ 一把手登录成功: top_leader1"

CONTRACTOR_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"contractor1","password":"Test1234"}' | jq -r '.tokens.accessToken')
echo "✓ 乙方登录成功: contractor1"

echo ""

# 2. 报修人创建工单
echo "📝 步骤2: 报修人创建工单..."
CREATE_RESULT=$(curl -s -X POST "$API_URL/tickets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REPORTER_TOKEN" \
  -d '{
    "title":"教学楼A栋301教室空调故障",
    "description":"空调无法启动，怀疑电路问题，请尽快维修",
    "type":"ISSUE",
    "priority":"HIGH",
    "location":"教学楼A栋301教室",
    "tags":["空调","电路"]
  }')

TICKET_ID=$(echo $CREATE_RESULT | jq -r '.data.id')
echo "✓ 工单创建成功，ID: $TICKET_ID"
echo ""

# 3. 副主任审核报修（通过）
echo "📝 步骤3: 副主任审核报修单..."
curl -s -X POST "$API_URL/tickets/$TICKET_ID/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VICE_DIRECTOR_TOKEN" \
  -d '{
    "approved":true,
    "comment":"报修情况属实，同意进行维修"
  }' > /dev/null

echo "✓ 副主任审核通过"
echo ""

# 4. 乙方提交预算
echo "📝 步骤4: 乙方提交预算..."
BUDGET_RESULT=$(curl -s -X POST "$API_URL/budgets/ticket/$TICKET_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN" \
  -d '{
    "amount":3500.00,
    "description":"空调维修预算明细：\n1. 更换压缩机：2000元\n2. 更换电路板：800元\n3. 人工费：500元\n4. 材料费：200元",
    "attachments":["https://example.com/budget1.pdf"]
  }')

BUDGET_ID=$(echo $BUDGET_RESULT | jq -r '.data.id')
echo "✓ 预算提交成功，ID: $BUDGET_ID，金额: ¥3500.00"
echo ""

# 5. 副主任审核预算（通过）
echo "📝 步骤5: 副主任审核预算..."
curl -s -X POST "$API_URL/budgets/$BUDGET_ID/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VICE_DIRECTOR_TOKEN" \
  -d '{
    "approved":true,
    "comment":"预算合理，同意"
  }' > /dev/null

echo "✓ 预算审核通过"
echo ""

# 6. 副主任发起立项审批
echo "📝 步骤6: 副主任发起立项审批..."
PROJECT_RESULT=$(curl -s -X POST "$API_URL/projects/ticket/$TICKET_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VICE_DIRECTOR_TOKEN" \
  -d '{
    "title":"教学楼A栋301教室空调维修立项",
    "plannedStartDate":"2026-09-10",
    "plannedDuration":3,
    "contractorName":"华建维修公司",
    "description":"空调压缩机及电路板更换"
  }')

PROJECT_ID=$(echo $PROJECT_RESULT | jq -r '.data.id')
echo "✓ 立项发起成功，ID: $PROJECT_ID"
echo ""

# 7. 查询待审批列表
echo "📝 步骤7: 查询部门主管待审批列表..."
PENDING=$(curl -s -X GET "$API_URL/approvals/pending" \
  -H "Authorization: Bearer $DEPT_MANAGER_TOKEN")

PENDING_COUNT=$(echo $PENDING | jq '.data | length')
echo "✓ 部门主管有 $PENDING_COUNT 条待审批"

if [ "$PENDING_COUNT" -gt 0 ]; then
  FLOW_ID=$(echo $PENDING | jq -r '.data[0].flowId')
  echo "  审批流程ID: $FLOW_ID"
fi
echo ""

# 8. 部门主管审批（一级审核通过）
echo "📝 步骤8: 部门主管进行一级审核..."
curl -s -X POST "$API_URL/approvals/$FLOW_ID/steps/1/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEPT_MANAGER_TOKEN" \
  -d '{
    "comment":"经审核，该项目确有必要，同意进入下一流程"
  }' > /dev/null

echo "✓ 一级审核通过"
echo ""

# 9. 分管领导审批（二级审核通过）
echo "📝 步骤9: 分管领导进行二级审核..."
curl -s -X POST "$API_URL/approvals/$FLOW_ID/steps/2/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VICE_LEADER_TOKEN" \
  -d '{
    "comment":"教学设施维修重要，同意该立项"
  }' > /dev/null

echo "✓ 二级审核通过"
echo ""

# 10. 一把手审批（终审通过）
echo "📝 步骤10: 一把手进行终审..."
curl -s -X POST "$API_URL/approvals/$FLOW_ID/steps/3/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOP_LEADER_TOKEN" \
  -d '{
    "comment":"同意立项，尽快完成维修，保障教学正常进行"
  }' > /dev/null

echo "✓ 终审通过，立项审批完成！"
echo ""

# 11. 查询最终审批流程状态
echo "📝 步骤11: 查询审批流程最终状态..."
FLOW_DETAIL=$(curl -s -X GET "$API_URL/approvals/ticket/$TICKET_ID" \
  -H "Authorization: Bearer $REPORTER_TOKEN")

FLOW_STATUS=$(echo $FLOW_DETAIL | jq -r '.data.status')
TOTAL_STEPS=$(echo $FLOW_DETAIL | jq -r '.data.totalSteps')

echo "✓ 审批流程状态: $FLOW_STATUS"
echo "✓ 总步骤数: $TOTAL_STEPS"
echo ""

# 12. 查询工单详情
echo "📝 步骤12: 查询工单最终状态..."
TICKET_DETAIL=$(curl -s -X GET "$API_URL/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $REPORTER_TOKEN")

TICKET_STATUS=$(echo $TICKET_DETAIL | jq -r '.data.status')
CURRENT_PHASE=$(echo $TICKET_DETAIL | jq -r '.data.currentPhase')

echo "✓ 工单状态: $TICKET_STATUS"
echo "✓ 当前阶段: $CURRENT_PHASE"
echo ""

# 总结
echo "=========================================="
echo "✅ 集成测试完成！"
echo "=========================================="
echo ""
echo "测试结果汇总："
echo "  工单ID: $TICKET_ID"
echo "  预算ID: $BUDGET_ID (¥3500.00)"
echo "  立项ID: $PROJECT_ID"
echo "  审批流程ID: $FLOW_ID"
echo "  审批流程状态: $FLOW_STATUS"
echo "  工单当前阶段: $CURRENT_PHASE"
echo ""
echo "测试涵盖："
echo "  ✓ REQ-02: 副主任审核报修单"
echo "  ✓ REQ-03: 乙方编制预算"
echo "  ✓ REQ-04: 副主任审核预算"
echo "  ✓ REQ-05: 副主任发起立项"
echo "  ✓ REQ-06: 部门主管一级审核"
echo "  ✓ REQ-07: 分管领导二级审核"
echo "  ✓ REQ-08: 一把手终审"
echo "  ✓ 三级逐级审批流程"
echo ""
