/**
 * One chart of a report.
 *
 * <b>The renderer lives in components/Chart.</b> The Reports catalogue and the
 * Safety Management System draw the same five shapes from the same
 * {labels, series} shape; two copies would drift, and the first symptom would
 * be a status donut whose colours meant one thing on one screen and another
 * somewhere else.
 */
export { default } from '../../../components/Chart'
