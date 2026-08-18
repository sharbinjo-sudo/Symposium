export function formatMemberCount(count: number) {
  return `${count} ${count === 1 ? "member" : "members"}`;
}

export function formatTeamRange(minTeamSize: number, maxTeamSize: number) {
  if (minTeamSize === maxTeamSize) {
    return formatMemberCount(minTeamSize);
  }

  return `${minTeamSize}-${maxTeamSize} members`;
}
