/** حقول API شائعة (camelCase / PascalCase) */

export function agendaItemId(item) {
  return item?.id ?? item?.Id
}

export function staffMemberId(row) {
  return row?.id ?? row?.staffMemberId ?? row?.StaffMemberId ?? row?.eventStaffMemberId
}

export function responsibleBlock(item) {
  return item?.responsible ?? item?.Responsible ?? null
}

export function responsibleStaffMemberId(item) {
  return item?.responsibleStaffMemberId ?? item?.ResponsibleStaffMemberId ?? null
}

export function orgUserApplicationId(u) {
  return u?.applicationUserId ?? u?.ApplicationUserId ?? u?.id ?? u?.Id
}

export function orgUserLabel(u) {
  const name = u?.displayName ?? u?.DisplayName ?? u?.name
  const email = u?.email ?? u?.Email
  if (name && email) return `${name} (${email})`
  return email || name || "—"
}
