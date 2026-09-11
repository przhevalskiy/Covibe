const GOAL_KEY = 'gantry_compose_goal_v1';

export function loadComposeGoal(): string {
  try {
    return sessionStorage.getItem(GOAL_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveComposeGoal(goal: string): void {
  try {
    if (goal.trim()) {
      sessionStorage.setItem(GOAL_KEY, goal);
    } else {
      sessionStorage.removeItem(GOAL_KEY);
    }
  } catch {
    /* ignore quota errors */
  }
}

export function clearComposeGoal(): void {
  try {
    sessionStorage.removeItem(GOAL_KEY);
  } catch {
    /* ignore */
  }
}
