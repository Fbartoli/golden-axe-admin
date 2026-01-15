import postgres from 'postgres'

const feConnectionString = process.env.PG_URL_FE || 'postgres://golden_axe:golden_axe@golden-axe-postgres:5432/fe'
const beConnectionString = process.env.PG_URL_BE || 'postgres://golden_axe:golden_axe@golden-axe-postgres:5432/be'

export const sql = postgres(feConnectionString)
export const beSql = postgres(beConnectionString)
