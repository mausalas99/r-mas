export function duplicationDebtFromJscpd(statistics) {
  const tokens = statistics?.total?.tokens || 0;
  return Math.ceil(tokens / 50);
}

export function computeTotalScore(parts) {
  return (
    (parts.complexityOverage || 0) +
    (parts.lengthOverage || 0) +
    (parts.duplicationDebt || 0) +
    (parts.importSmellDebt || 0) +
    (parts.bootGraphDebt || 0)
  );
}

/** ESLint JSON: complexity overage only. File/function length is not debt. */
export function eslintDebtFromResults(results) {
  let complexityOverage = 0;
  for (const file of results) {
    for (const msg of file.messages || []) {
      if (msg.ruleId === 'complexity') complexityOverage += 10;
    }
  }
  return { complexityOverage, lengthOverage: 0 };
}
