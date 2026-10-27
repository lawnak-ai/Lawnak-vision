// Chart.js and Leaflet, embedded as text into slides that use charts or maps,
// so an exported deck is still a single file. (Paths skip the packages' export maps.)
import chartJs from '../../node_modules/chart.js/dist/chart.umd.min.js?raw'
import leafletJs from '../../node_modules/leaflet/dist/leaflet.js?raw'
import leafletCss from '../../node_modules/leaflet/dist/leaflet.css?raw'

// A "</script>" or "</style>" inside the library would end the tag early.
const inline = (code: string): string => code.replace(/<\/(script|style)/gi, '<\/$1')

export const CHART_LIB_JS = inline(chartJs)
export const MAP_LIB_JS = inline(leafletJs)
export const MAP_LIB_CSS = inline(leafletCss)
