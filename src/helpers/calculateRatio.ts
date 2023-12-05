export function calculateRatio(wins_kills: number, losses_deaths: number) {
  return losses_deaths > 0
    ? Math.round((wins_kills / losses_deaths) * 100) / 100
    : wins_kills;
}
