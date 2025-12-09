
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/inicio",
    "route": "/"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-K3TB2B7O.js",
      "chunk-Q4K47LU7.js"
    ],
    "route": "/inicio"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-7RQSSA7G.js"
    ],
    "route": "/locales"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-OIYIWCXC.js"
    ],
    "route": "/gastronomia"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-L2JT46UW.js"
    ],
    "route": "/eventos"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-OD2Y5FN5.js"
    ],
    "route": "/noticias"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-HTHT3UN5.js",
      "chunk-OSN4AMAB.js"
    ],
    "route": "/perfil"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-766Z7XJT.js",
      "chunk-OSN4AMAB.js"
    ],
    "route": "/contacto"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-Z2XXEIUT.js",
      "chunk-Q4K47LU7.js"
    ],
    "route": "/salon"
  },
  {
    "renderMode": 2,
    "redirectTo": "/inicio",
    "route": "/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 6814, hash: '8bd969a8470603743209e6a6a91a21c6ea8f997ac5b4d32e514310b679513bd0', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1124, hash: 'ce86c92dbef8e469b99c0aad5510bf0177ffc4c12c839cf1ed88cdc9520f0c5e', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'locales/index.html': {size: 36053, hash: '0dd2277679868f975899bc6c13ea1a8e1b7f211632ed772685188330e8502807', text: () => import('./assets-chunks/locales_index_html.mjs').then(m => m.default)},
    'perfil/index.html': {size: 34644, hash: '4b810bed65c1a17c7abde208e98f5e6352b986e24285b956c2babb3119c8cb4f', text: () => import('./assets-chunks/perfil_index_html.mjs').then(m => m.default)},
    'inicio/index.html': {size: 47038, hash: 'c633d760c5b1521cb3dfb30862ff1268b325df91b5e65b7745da6a923d1a34eb', text: () => import('./assets-chunks/inicio_index_html.mjs').then(m => m.default)},
    'contacto/index.html': {size: 35267, hash: '37a8eab595b17459e593776010d42c67a9ff624a8868d7bd11ccb833de55e387', text: () => import('./assets-chunks/contacto_index_html.mjs').then(m => m.default)},
    'noticias/index.html': {size: 37768, hash: '8572da92f3b03f36b111c9541316a042b069af64ab7d3046c65bdce128e27431', text: () => import('./assets-chunks/noticias_index_html.mjs').then(m => m.default)},
    'gastronomia/index.html': {size: 33831, hash: '948991883bde540b6d827a10b181088a731c40d7fd22a8be72fccd38fe7dee6d', text: () => import('./assets-chunks/gastronomia_index_html.mjs').then(m => m.default)},
    'salon/index.html': {size: 40065, hash: '79a926cdcdd1c680cf34ae8da91ed2864afe942c95b2320845c0e0f87690ff8e', text: () => import('./assets-chunks/salon_index_html.mjs').then(m => m.default)},
    'eventos/index.html': {size: 37831, hash: '0e4d8c4f9dd4c3eed3dc75b4d5eb9afad717f7ac439c19a093013c576af5f76e', text: () => import('./assets-chunks/eventos_index_html.mjs').then(m => m.default)},
    'styles-KJP5CB5B.css': {size: 7131, hash: 'hnv7fVtA02o', text: () => import('./assets-chunks/styles-KJP5CB5B_css.mjs').then(m => m.default)}
  },
};
