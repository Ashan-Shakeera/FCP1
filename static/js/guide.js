(function(){
'use strict';

/* ============================================================
   ROUTE MAP (injected from template via window.HB_TOOL_ROUTES)
   Falls back to /static/tools/<file> if a route is missing.
   ============================================================ */
const ROUTES = window.HB_TOOL_ROUTES || {};
function routeFor(toolId, fallbackFile){
  if (ROUTES[toolId]) return ROUTES[toolId];
  return '/static/tools/' + encodeURIComponent(fallbackFile);
}

/* ============================================================
   TOOL DATA
   ============================================================ */
const TOOLS = [
  /* ---------- COLOR & AI ---------- */
  {
    id:'ai-prompt-palette',
    name:'AI Prompt Palette',
    file:'AI prompt palette.html',
    icon:'fa-comment-dots',
    grad:'grad-1',
    cat:'color',
    catLabel:'Color & AI',
    desc:'Generate intelligent color palettes from text prompts. Includes 100-color dataset, cultural meanings, an AI chatbot assistant, gradient studio, and custom palette builder.',
    tags:['100 colors','AI chatbot','gradients','8 dimensions'],
    features:[
      'Prompt-based palette generation using seeded hashing',
      'Rich 100-color dataset with psychology, culture & industry data',
      'Floating AI chatbot that answers color questions',
      'Gradient Studio with direction controls and copyable CSS',
      'Custom palette builder with localStorage persistence',
      'AI-powered search across name, hex, meaning, mood and industry'
    ],
    steps:[
      {t:'Type a prompt like <code>midnight aurora</code> or <code>terracotta sunset</code> into the Prompt Palette input.'},
      {t:'Click <strong>Generate</strong> to create 5 colors. Click any swatch to load its full AI analysis.'},
      {t:'Open the <strong>AI chatbot</strong> (top-right robot icon) and ask questions like "What colors are calming?" or "Colors for technology".'},
      {t:'Use the <strong>Gradient Studio</strong> to blend two colors, pick a direction, and copy the CSS.'}
    ],
    shortcuts:[
      {k:'Enter',d:'Generate palette from prompt'},
      {k:'Click swatch',d:'Load AI color analysis'}
    ]
  },
  {
    id:'color-compass',
    name:'Chroma Compass · Color Meanings',
    file:'Discover color meanings.html',
    icon:'fa-book-open',
    grad:'grad-2',
    cat:'color',
    catLabel:'Color & AI',
    desc:'Discover the meaning and symbolism of 28 colors. Interactive color wheel, search by emotion, and a beautiful card grid of positive and shadow traits.',
    tags:['28 colors','psychology','interactive wheel','search'],
    features:[
      'Interactive 300px color wheel — click any hue to reveal meaning',
      '28 colors with positive and negative symbolism',
      'Search by meaning: love, sadness, trust, energy, calm, luxury…',
      'Quick chips for common emotional themes',
      'Beautiful card grid with badges for positive and shadow traits'
    ],
    steps:[
      {t:'Click anywhere on the <strong>color wheel</strong> to see the closest named color and its meaning.'},
      {t:'Use the <strong>search bar</strong> to find colors by emotion (e.g. "love", "calm", "royalty").'},
      {t:'Click a <strong>quick chip</strong> below the search to instantly filter by a mood.'},
      {t:'Click any card in the grid to load its meaning into the wheel panel.'}
    ],
    shortcuts:[]
  },
  {
    id:'hela-platte',
    name:'Hela Color Platte',
    file:'HelaPlatte.html',
    icon:'fa-swatchbook',
    grad:'grad-6',
    cat:'color',
    catLabel:'Color & AI',
    desc:'An infinite palette generator inspired by Color Hunt. Browse trending, popular, random and saved palettes. Click any color to copy its hex.',
    tags:['infinite palettes','saved','trending','generate'],
    features:[
      'Infinite scroll with lazy-loaded palettes',
      'Trending, Popular, Random and Saved filters',
      'Click any color block to instantly copy its HEX',
      'Save favourite palettes to localStorage',
      'Press Space anywhere to generate fresh palettes'
    ],
    steps:[
      {t:'Click a <strong>tab</strong> (Trending, Popular, Random, Saved) to switch the feed.'},
      {t:'Hover any color block and click to <strong>copy its hex</strong>.'},
      {t:'Click the <strong>heart</strong> on a palette to save it.'},
      {t:'Press <code>Space</code> to generate a fresh set of palettes.'}
    ],
    shortcuts:[
      {k:'Space',d:'Generate fresh palettes'}
    ]
  },
  {
    id:'main-extractor',
    name:'Main Color Extractor',
    file:'Main Color Extractor.html',
    icon:'fa-chart-line',
    grad:'grad-4',
    cat:'color',
    catLabel:'Color & AI',
    desc:'Extract only the dominant colors from any image using k-means clustering. Perfect when you need the main palette without sub-shades.',
    tags:['k-means','5–30 colors','export CSV/JSON'],
    features:[
      'K-means clustering for truly dominant colors',
      'Adjustable 5–30 color count',
      'Drag & drop, browse, and paste support',
      'Click any color card to copy its hex',
      'Export as CSV or JSON'
    ],
    steps:[
      {t:'Drag an image onto the drop zone (or click to browse).'},
      {t:'Adjust the <strong>Number of main colors</strong> slider (5–30).'},
      {t:'Click <strong>Extract main colors</strong> to run k-means clustering.'},
      {t:'Click any color card to copy its hex, or use <strong>Export CSV/JSON</strong>.'}
    ],
    shortcuts:[]
  },
  {
    id:'full-breakdown',
    name:'Full Color Breakdown',
    file:'Full Color Breakdown.html',
    icon:'fa-chart-simple',
    grad:'grad-3',
    cat:'color',
    catLabel:'Color & AI',
    desc:'See every distinct RGB color in an image. Unlike the extractor, this lists all colors ranked by pixel count with exact percentages.',
    tags:['every color','pixel count','CSV/JSON'],
    features:[
      'Lists every unique RGB color in the image',
      'Shows pixel count and exact percentage per color',
      'Automatic canvas scaling for very large images',
      'Dark / light theme toggle',
      'Export CSV or JSON of the full breakdown'
    ],
    steps:[
      {t:'Drop or browse an image (up to 50 MB).'},
      {t:'Wait for analysis — the grid will show every unique color.'},
      {t:'Click any card to copy its hex.'},
      {t:'Use <strong>Export CSV / JSON</strong> for the full dataset.'}
    ],
    shortcuts:[]
  },
  {
    id:'color-mix-game',
    name:'Guess the Mix',
    file:'ColorMixGame.html',
    icon:'fa-flask',
    grad:'grad-5',
    cat:'color',
    catLabel:'Color & AI',
    desc:'A premium color-matching game powered by Kubelka-Munk pigment mixing theory and CIEDE2000 perceptual difference. Match the target color by mixing real pigments.',
    tags:['game','pigment mixing','CIEDE2000','kubelka-munk'],
    features:[
      'Realistic pigment mixing via Spectral.js (Kubelka-Munk)',
      'Perceptual color matching using CIEDE2000 (DeltaE)',
      '10 realistic paint pigments including Ultramarine, Cadmium',
      'Three difficulty levels: easy, normal, hard',
      'Undo, hint system, and persistent best score'
    ],
    steps:[
      {t:'Look at the <strong>target color</strong> shown at the top.'},
      {t:'Tap pigment swatches to build a mix that matches the target.'},
      {t:'Watch the <strong>match percentage</strong> update in real time.'},
      {t:'Reach the tolerance for your difficulty to win the round.'}
    ],
    shortcuts:[
      {k:'Ctrl+Z',d:'Undo last pigment'},
      {k:'Enter',d:'New round'},
      {k:'Esc',d:'Close win modal'}
    ]
  },

  /* ---------- DESIGN STUDIOS ---------- */
  {
    id:'design-studio',
    name:'Design Studio',
    file:'Design Studio.html',
    icon:'fa-wand-magic-sparkles',
    grad:'grad-1',
    cat:'design',
    catLabel:'Design Studios',
    desc:'Professional canvas editor powered by Fabric.js. Layers, shapes, text, gradients, image masking, photo filters, and full undo/redo.',
    tags:['Fabric.js','layers','filters','masking'],
    features:[
      'Full layer panel with visibility, grouping and ordering',
      'Pen, brush, eraser, shapes, text and gradient tools',
      '8 alignment presets and canvas size in inches',
      'Custom multi-stop gradient builder',
      'Photo filters: hue, RGB balance, temperature, saturation',
      'Rectangle and circle image masks'
    ],
    steps:[
      {t:'Click <strong>Load Photo</strong> to import an image, or draw directly on the canvas.'},
      {t:'Use the top toolbar to switch between select, pen, brush, shapes and text tools.'},
      {t:'Manage layers in the right panel — drag to reorder, click the eye to hide.'},
      {t:'Apply filters in the <strong>Hue &amp; Color</strong> section of the right panel.'},
      {t:'Click <strong>Export</strong> to download your design as a PNG.'}
    ],
    shortcuts:[
      {k:'Ctrl+Z',d:'Undo'},
      {k:'Ctrl+Y',d:'Redo'},
      {k:'Delete',d:'Delete selected object'}
    ]
  },
  {
    id:'hela-ui',
    name:'HelaUI · UI/UX Studio',
    file:'HelaUI.html',
    icon:'fa-mobile-screen-button',
    grad:'grad-6',
    cat:'design',
    catLabel:'Design Studios',
    desc:'A professional UI/UX design tool. Build interfaces with frames, text, shapes, layers, and per-layer animation timelines. Export to PNG or SVG.',
    tags:['UI design','Figma-like','animation','export'],
    features:[
      'Frame, text, shape, path and image elements',
      'Full layers panel with drag-reordering',
      'Per-layer animation tracks with independent timing',
      '7 animation properties: rotation, scale, opacity, glow, hue, flash, wobble',
      'Preview mode with prototype links between pages',
      'Export to PNG (2×) and SVG'
    ],
    steps:[
      {t:'Use the <strong>frame tool</strong> to create a phone/tablet canvas.'},
      {t:'Add text, shapes and images with the floating toolbar.'},
      {t:'Open the <strong>Animate</strong> tab to add motion — each layer has its own timeline.'},
      {t:'Press <code>Shift+P</code> to preview. Click prototype links to jump between pages.'},
      {t:'Click <strong>Export</strong> to download as PNG or SVG.'}
    ],
    shortcuts:[
      {k:'V',d:'Select tool'},
      {k:'F',d:'Frame'},
      {k:'R',d:'Rectangle'},
      {k:'T',d:'Text'},
      {k:'Space',d:'Pan canvas'},
      {k:'Shift+P',d:'Preview mode'},
      {k:'Tab',d:'Toggle sidebar'},
      {k:'Ctrl+Z',d:'Undo'}
    ]
  },
  {
    id:'vectorforge',
    name:'VectorForge Pro',
    file:'vectot.html',
    icon:'fa-bezier-curve',
    grad:'grad-3',
    cat:'design',
    catLabel:'Design Studios',
    desc:'Illustrator-style vector studio with select/direct/pen tools, polygons, stars, layers, groups, alignment and SVG export.',
    tags:['SVG','vector','pen tool','layers'],
    features:[
      'Select, Direct Select, Pen, Pencil tools',
      'Rectangle, ellipse, polygon, star and line shapes',
      'Full layer system with blend modes and opacity',
      'Group / ungroup and 8 alignment presets',
      'Numeric transform inputs (X, Y, rotation)',
      'Export to SVG (editable) or PNG'
    ],
    steps:[
      {t:'Choose a tool from the top toolbar — try <strong>Rect</strong> or <strong>Pen</strong>.'},
      {t:'Draw on the canvas. Shapes appear in the active layer.'},
      {t:'Use the <strong>Layers</strong> panel (right) to organise and toggle visibility.'},
      {t:'Select multiple objects and use <strong>Align</strong> or <strong>Group</strong>.'},
      {t:'Export as <strong>SVG</strong> for editable vectors, or PNG for raster.'}
    ],
    shortcuts:[
      {k:'V',d:'Select'},
      {k:'A',d:'Direct select'},
      {k:'P',d:'Pen'},
      {k:'R',d:'Rectangle'},
      {k:'E',d:'Ellipse'},
      {k:'L',d:'Line'},
      {k:'Ctrl+Z',d:'Undo'},
      {k:'Ctrl+G',d:'Group'},
      {k:'Del',d:'Delete'}
    ]
  },
  {
    id:'mandala-studio',
    name:'Mandala Studio',
    file:'mandela.html',
    icon:'fa-snowflake',
    grad:'grad-5',
    cat:'design',
    catLabel:'Design Studios',
    desc:'Pro vector mandala creator with 16 curtain-style generators, 6 symmetry modes, per-layer animation, and SVG + WebM export.',
    tags:['mandala','symmetry','animation','SVG'],
    features:[
      '6 symmetry modes: radial, mirror, spiral, kaleido, wave, none',
      'Up to 96 radial segments with rotation control',
      'Ring generator with 9 element types (petal, dot, star, lens…)',
      'Per-layer animation tracks with independent timing',
      '8 animation presets: spin, breathe, hypnotic, aurora, sparkle…',
      'Export PNG, transparent PNG, SVG, animated SVG and WebM video'
    ],
    steps:[
      {t:'Set <strong>Segments</strong> in the Symm tab to choose your symmetry count.'},
      {t:'Use the <strong>Gen</strong> tab to auto-build a full mandala or pick a template.'},
      {t:'Draw freehand on the canvas — strokes are automatically mirrored.'},
      {t:'Open the <strong>Anim</strong> tab to add rotation, scaling, glow and per-layer offsets.'},
      {t:'Export from the <strong>Export</strong> tab — try Animated SVG for a self-running art piece.'}
    ],
    shortcuts:[
      {k:'B',d:'Brush'},
      {k:'E',d:'Eraser'},
      {k:'G',d:'Fill'},
      {k:'Space',d:'Play / pause animation'},
      {k:'Ctrl+Z',d:'Undo'},
      {k:'Ctrl+S',d:'Download PNG'},
      {k:'?',d:'Shortcuts help'}
    ]
  },
  {
    id:'design-hub',
    name:'Design Hub',
    file:'DesignHub.html',
    icon:'fa-toolbox',
    grad:'grad-2',
    cat:'design',
    catLabel:'Design Studios',
    desc:'Your starting point — 6 creative destinations in one place. Beautiful glassmorphic hub linking to every major tool with animated orbs and ripple effects.',
    tags:['hub','navigation','glassmorphism'],
    features:[
      'Six tool cards linking to every major studio',
      'Animated floating orbs and grid background',
      'Live ripple feedback on every interaction',
      'Fully responsive from mobile to 4K',
      'Direct homepage link and Open Studio CTA'
    ],
    steps:[
      {t:'Browse the six tool cards — Design Studio, HelaCanvas, HelaDesign, HelaUI, Mandela, Vector.'},
      {t:'Click any card to jump straight into that tool.'},
      {t:'Use <strong>Open Studio</strong> in the navbar to launch the flagship Design Studio.'},
      {t:'Click <strong>Home</strong> to return to the homepage.'}
    ],
    shortcuts:[]
  },

  /* ---------- IMAGE EDITING ---------- */
  {
    id:'image-studio',
    name:'Image Studio · BG Remover',
    file:'bg.html',
    icon:'fa-scissors',
    grad:'grad-3',
    cat:'image',
    catLabel:'Image Editing',
    desc:'Remove backgrounds with AI or 5 manual tools. Extract palettes, sample pixels with a loupe, and export transparent PNGs.',
    tags:['BG removal','AI','5 tools','transparent PNG'],
    features:[
      'AI background removal (runs in-browser via @imgly)',
      '5 manual tools: Magic Wand, Quick Select, Erase Box, Brush, Restore',
      'Real-time palette extraction with adjustable color count',
      'Pixel loupe with 9× magnification for precise sampling',
      'Preview background options: transparent, white, black, custom',
      'Export PNG, JPG, or copy to clipboard'
    ],
    steps:[
      {t:'Drag & drop, paste (<code>Ctrl+V</code>) or upload an image.'},
      {t:'For automatic removal, click <strong>Remove background automatically</strong> (first run downloads ~40MB of models).'},
      {t:'Or switch to the <strong>Remove BG</strong> tab and use the manual tools.'},
      {t:'Adjust tolerance and feather for cleaner edges.'},
      {t:'Download as PNG or JPG from the Export section.'}
    ],
    shortcuts:[
      {k:'W',d:'Magic Wand'},
      {k:'Q',d:'Quick Select'},
      {k:'E',d:'Erase Box'},
      {k:'B',d:'Brush'},
      {k:'R',d:'Restore'},
      {k:'Ctrl+Z',d:'Undo'},
      {k:'Ctrl+V',d:'Paste image from clipboard'}
    ]
  },
  {
    id:'line-lab',
    name:'LineLab · Image to Line Art',
    file:'LineLab.html',
    icon:'fa-pen-nib',
    grad:'grad-6',
    cat:'image',
    catLabel:'Image Editing',
    desc:'Turn any photo into clean line art. Six algorithms including Sketch, Pencil, Canny, XDoG and Threshold. Export as PNG or traced SVG.',
    tags:['line art','6 algorithms','SVG trace'],
    features:[
      '6 algorithms: Sketch, Pencil, Edges, Canny, XDoG, Threshold',
      'Adjustable blur, threshold, line width and contrast',
      'Interactive split-view comparison slider',
      'Invert and transparent-background options',
      'Export as PNG or as true vector SVG'
    ],
    steps:[
      {t:'Drop or upload an image, or click <strong>Try demo</strong> for a sample.'},
      {t:'Choose an algorithm from the left sidebar — try <strong>Canny</strong> for crisp outlines.'},
      {t:'Drag the <strong>split slider</strong> to compare original vs. line art.'},
      {t:'Fine-tune blur, threshold, line width and contrast sliders.'},
      {t:'Click <strong>PNG</strong> or <strong>SVG</strong> in the top bar to export.'}
    ],
    shortcuts:[
      {k:'Ctrl+S',d:'Export PNG'},
      {k:'Ctrl+O',d:'Open image'}
    ]
  },
  {
    id:'pixelforge',
    name:'HelaCanvas · PixelForge',
    file:'HelaCanvas.html',
    icon:'fa-image',
    grad:'grad-7',
    cat:'image',
    catLabel:'Image Editing',
    desc:'A full Photoshop-style image editor in your browser. Layers, brushes, filters, blend modes, custom fonts, SVG and JSON export.',
    tags:['photoshop-like','layers','filters','fonts'],
    features:[
      'Full layer system with thumbnails, locks and blend modes',
      'Brush, eraser, fill, eyedropper, shapes and text tools',
      'Adjustments: brightness, contrast, saturation, hue, blur, sepia',
      'Quick filters: grayscale, invert, sharpen, noise',
      '35+ Google Fonts available in the text tool',
      'Export PNG, JPEG, SVG and save/load project JSON'
    ],
    steps:[
      {t:'Use <strong>File → Open Image</strong> to load a photo, or start with the blank canvas.'},
      {t:'Pick a tool from the left rail — brush (B), eraser (E), fill (G), text (T)…'},
      {t:'Adjust layer opacity and blend mode in the Layers panel.'},
      {t:'Apply adjustments from the <strong>Adjustments</strong> panel (right side).'},
      {t:'Export via <strong>File → Export PNG / JPG / SVG</strong>.'}
    ],
    shortcuts:[
      {k:'V',d:'Move'},
      {k:'M',d:'Marquee'},
      {k:'C',d:'Crop'},
      {k:'I',d:'Eyedropper'},
      {k:'B',d:'Brush'},
      {k:'E',d:'Eraser'},
      {k:'G',d:'Fill'},
      {k:'U',d:'Rectangle / Ellipse'},
      {k:'T',d:'Text'},
      {k:'H',d:'Hand'},
      {k:'Z',d:'Zoom'},
      {k:'Ctrl+Z',d:'Undo'},
      {k:'Ctrl+S',d:'Export PNG'},
      {k:'Tab',d:'Toggle sidebar'}
    ]
  },

  /* ---------- PAINTING & ART ---------- */
  {
    id:'live-painting',
    name:'Live Painting Studio',
    file:'paint.html',
    icon:'fa-paintbrush',
    grad:'grad-2',
    cat:'paint',
    catLabel:'Painting & Art',
    desc:'Paint over line art with a rich brush engine, color wheel, harmony guides, symmetry, selection tools and a full Color Theory analysis report.',
    tags:['color wheel','harmony','symmetry','analysis'],
    features:[
      'Advanced color wheel with hue ring + SV square',
      '7 harmony schemes: complementary, analogous, triadic, tetradic…',
      'Brush types: round, square, marker, spray',
      'Symmetry modes: off, vertical, horizontal, quad',
      'Quick Select magic tool with tolerance control',
      'Full Color Theory Analysis modal with grade S–E'
    ],
    steps:[
      {t:'Upload black-and-white line art using the <strong>Upload Line Art</strong> button.'},
      {t:'Pick a color from the wheel or palette, then paint with the brush.'},
      {t:'Enable <strong>Symmetry</strong> for mirrored strokes, or <strong>Quick Select</strong> to paint only inside a region.'},
      {t:'Click <strong>Analyze Color Theory</strong> to get a detailed report with suggestions.'},
      {t:'Download as PNG when finished.'}
    ],
    shortcuts:[
      {k:'B',d:'Brush'},
      {k:'E',d:'Eraser'},
      {k:'G',d:'Fill'},
      {k:'I',d:'Eyedropper'},
      {k:'W',d:'Quick Select'},
      {k:'[ / ]',d:'Brush size down / up'},
      {k:'X',d:'Toggle line art visibility'},
      {k:'Ctrl+E',d:'Analyze color theory'},
      {k:'Ctrl+Z',d:'Undo'}
    ]
  },
  {
    id:'line-pro',
    name:'LinePro · Live Painting',
    file:'LinePro.html',
    icon:'fa-palette',
    grad:'grad-4',
    cat:'paint',
    catLabel:'Painting & Art',
    desc:'An alternative live painting studio with the same Color Theory engine, symmetry brush, and a floating action panel. Fully responsive on mobile.',
    tags:['painting','symmetry','analysis','mobile'],
    features:[
      'Same advanced color wheel and 7 harmony schemes',
      'Brush, eraser, fill, eyedropper and quick select tools',
      'Real-time symmetry mirroring',
      'Floating selection status pill with quick deselect',
      'Color theory analysis with grade, metrics and suggestions',
      'Mobile-first responsive design'
    ],
    steps:[
      {t:'Upload line art with the <strong>Choose Image</strong> button.'},
      {t:'Select colors from the wheel and paint — symmetry optional.'},
      {t:'Use <strong>Quick Select</strong> to restrict painting to a region.'},
      {t:'Analyze your work via <strong>Analyze Color Theory</strong>.'},
      {t:'Export PNG when ready.'}
    ],
    shortcuts:[
      {k:'B/E/G/I/W',d:'Switch tools'},
      {k:'[ / ]',d:'Size down / up'},
      {k:'Ctrl+E',d:'Analyze'},
      {k:'Ctrl+Z',d:'Undo'},
      {k:'Ctrl+S',d:'Download'}
    ]
  },
  {
    id:'chromafill',
    name:'ChromaFill Pro',
    file:'paint art.html',
    icon:'fa-fill-drip',
    grad:'grad-5',
    cat:'paint',
    catLabel:'Painting & Art',
    desc:'A specialized brush + fill tool with built-in target-color scoring. Set targets for regions, paint, and calculate your match score.',
    tags:['fill','brush','scoring','targets'],
    features:[
      'Brush, Fill and Set-Target modes',
      'Target color scoring per region',
      'Live match percentage calculation',
      'Color wheel with brightness slider',
      'Recent colors palette',
      'Undo and full reset'
    ],
    steps:[
      {t:'Upload line art using the <strong>Upload Line Art</strong> button.'},
      {t:'Switch to <strong>Set Target</strong> mode and click regions to assign target colors.'},
      {t:'Switch to <strong>Brush</strong> or <strong>Fill</strong> and paint those regions.'},
      {t:'Click <strong>Calculate Match Score</strong> to see your accuracy percentage.'},
      {t:'Targets can be removed individually from the target list.'}
    ],
    shortcuts:[]
  },
  {
    id:'hela-fill',
    name:'HelaFill Pro',
    file:'paint art.html',
    icon:'fa-vector-square',
    grad:'grad-6',
    cat:'paint',
    catLabel:'Painting & Art',
    desc:'ChromaFill Pro is also known as HelaFill — the same target-scoring brush tool with a brighter, light-mode-first design.',
    tags:['fill','brush','scoring','light mode'],
    features:[
      'Full light / dark mode toggle',
      'Brush respects outlines automatically',
      'Flood fill with adjustable tolerance',
      'Target regions with live scoring',
      'Color wheel + brightness control'
    ],
    steps:[
      {t:'Load line art and pick a mode: Brush, Fill or Set Target.'},
      {t:'In <strong>Set Target</strong> mode, click regions to mark them with the current color.'},
      {t:'Paint or fill those regions with the brush / bucket.'},
      {t:'Click <strong>Calculate Match Score</strong> for your accuracy percentage.'}
    ],
    shortcuts:[]
  },

  /* ---------- CREATIVE TOOLS ---------- */
  {
    id:'interior-studio',
    name:'Interior Studio Pro',
    file:'Interiol.html',
    icon:'fa-couch',
    grad:'grad-4',
    cat:'creative',
    catLabel:'Creative Tools',
    desc:'Redesign any room. Upload a photo and apply wall paint, tiles, flooring, wallpaper and 16 curtain styles — including your own uploaded fabric.',
    tags:['interior design','curtains','paint','tiles'],
    features:[
      '16 curtain styles from Empire swags to Japanese blinds',
      'Upload your own fabric or tile patterns',
      'Wall paint with colour-blend technology',
      'Perspective-mapped floor with 7 pattern types',
      'Smart suggestions based on uploaded patterns',
      'Auto-generated color themes from room palette'
    ],
    steps:[
      {t:'Drop your room photo onto the upload zone.'},
      {t:'Use the layer cards to enable <strong>Curtains</strong>, <strong>Wall paint</strong>, <strong>Tiles</strong>, <strong>Floor</strong> and <strong>Wallpaper</strong>.'},
      {t:'For curtains, choose one of 16 styles or upload your own fabric.'},
      {t:'Try the <strong>Smart Suggestions</strong> panel for one-click improvements.'},
      {t:'Click <strong>Export PNG</strong> to download your redesign.'}
    ],
    shortcuts:[
      {k:'Esc',d:'Reset project'},
      {k:'Ctrl+S',d:'Export PNG'}
    ]
  },
  {
    id:'fashion-matcher',
    name:'Fashion Color Matcher',
    file:'fashion.html',
    icon:'fa-tshirt',
    grad:'grad-2',
    cat:'creative',
    catLabel:'Creative Tools',
    desc:'Upload a dress photo and get intelligent bag and jewelry color recommendations. Includes a live AI fashion chatbot for advice.',
    tags:['fashion','bags','jewelry','chatbot'],
    features:[
      'K-means dress color extraction',
      'Bag color matching with complementary + neutral suggestions',
      'Jewelry recommendation with warm/cool detection',
      'Live fashion AI chatbot (with local fallback)',
      'Click any color card or match to copy its hex',
      'Dark / light theme toggle'
    ],
    steps:[
      {t:'Upload a dress photo (drag & drop, browse, or paste).'},
      {t:'Adjust the <strong>Colors</strong> slider (3–20) and click <strong>Extract &amp; Match</strong>.'},
      {t:'Browse the <strong>Bag Color Match</strong> and <strong>Jewelry Match</strong> lists.'},
      {t:'Click any suggestion to copy its hex code.'},
      {t:'Chat with the AI assistant for personalised advice.'}
    ],
    shortcuts:[
      {k:'Enter',d:'Send chat message'}
    ]
  },
  {
    id:'sign-studio',
    name:'Digital Sign Studio',
    file:'sign.html',
    icon:'fa-sign-hanging',
    grad:'grad-1',
    cat:'creative',
    catLabel:'Creative Tools',
    desc:'Create beautiful digital signage. Upload an image, choose from 4 elegant templates, and add your name, year and subtitle.',
    tags:['signage','4 templates','export'],
    features:[
      '4 templates: Modern, Classic, Bold, Elegant',
      'Name, year and optional subtitle fields',
      'Live canvas preview with automatic text layout',
      'Upload any background image',
      'Export as high-resolution PNG'
    ],
    steps:[
      {t:'Upload a background image or use the built-in gradient placeholder.'},
      {t:'Pick a template: <strong>Modern</strong>, <strong>Classic</strong>, <strong>Bold</strong> or <strong>Elegant</strong>.'},
      {t:'Fill in the <strong>Name</strong>, <strong>Year</strong> and optional <strong>Subtitle</strong>.'},
      {t:'Watch the live preview update instantly.'},
      {t:'Click <strong>Export</strong> to download your sign as PNG.'}
    ],
    shortcuts:[]
  },

  /* ---------- PLATFORM ---------- */
  {
    id:'homepage',
    name:'Homepage · Creative Studio',
    file:'homepage.html',
    icon:'fa-house',
    grad:'grad-1',
    cat:'platform',
    catLabel:'Platform',
    desc:'The main creative platform homepage. Features a live Hex Preview tool, interactive color wheel, and links to every tool in the ecosystem.',
    tags:['homepage','hex preview','color wheel'],
    features:[
      'Live Hex Preview with instant validation and copy',
      'Harmony color strips and tint/shade generator',
      'Interactive Hela Studio color wheel',
      'Sidebar navigation to every tool',
      'User session support (integrates with sign in)',
      'Full dark / light theme'
    ],
    steps:[
      {t:'Type any hex code into the <strong>Hex Preview</strong> field to see the color instantly.'},
      {t:'Browse harmony colors, tints and shades — click any to copy.'},
      {t:'Use the <strong>Hela Studio</strong> wheel to pick and generate harmonies.'},
      {t:'Navigate to any tool from the left sidebar.'}
    ],
    shortcuts:[]
  },
  {
    id:'main-dashboard',
    name:'Main Dashboard',
    file:'main.html',
    icon:'fa-chart-line',
    grad:'grad-7',
    cat:'platform',
    catLabel:'Platform',
    desc:'The creative platform dashboard after signing in. Feed, profile, messages, friends, marketplace, analytics, notifications and settings.',
    tags:['dashboard','social','messages','marketplace'],
    features:[
      'Full social feed with posts, likes and comments',
      'User profile with avatar and banner upload',
      'Encrypted messaging (AES-256-GCM via WebCrypto)',
      'Friends and follower system',
      'Digital marketplace with cart and checkout',
      'Analytics, notifications, activity and settings'
    ],
    steps:[
      {t:'Sign in from <strong>signinup.html</strong> to create a session.'},
      {t:'Use the left sidebar to navigate between Dashboard, Feed, Profile, Messages and more.'},
      {t:'In <strong>Messages</strong>, click a conversation to send an encrypted message.'},
      {t:'In <strong>Marketplace</strong>, add listings to cart and checkout.'},
      {t:'Try the global search (<code>/</code> shortcut) to find users, posts and listings.'}
    ],
    shortcuts:[
      {k:'/',d:'Focus global search'},
      {k:'Esc',d:'Close modal'},
      {k:'Enter',d:'Send chat message'}
    ]
  },
  {
    id:'auth',
    name:'Sign In / Sign Up',
    file:'signinup.html',
    icon:'fa-right-to-bracket',
    grad:'grad-3',
    cat:'platform',
    catLabel:'Platform',
    desc:'The auth gateway with beautiful left-panel videos (3.mp4 for sign in, 2.mp4 for sign up). Full validation and forgot-password flow.',
    tags:['auth','validation','forgot password','videos'],
    features:[
      'Split layout with animated video panels',
      'Full field validation with shake errors',
      'Password strength meter',
      'Forgot password flow with success state',
      'Demo account: demo / demo1234',
      'Redirects to homepage.html on success'
    ],
    steps:[
      {t:'Enter a username and password to sign in — try <code>demo</code> / <code>demo1234</code>.'},
      {t:'Switch to <strong>Sign Up</strong> to create an account (stored locally).'},
      {t:'Forgot password? Click the link to access the reset flow.'},
      {t:'On success, you are redirected to <strong>homepage.html</strong>.'}
    ],
    shortcuts:[
      {k:'Enter',d:'Submit form'}
    ]
  },
  {
    id:'welcome',
    name:'Modern Welcome',
    file:'index.html',
    icon:'fa-door-open',
    grad:'grad-6',
    cat:'platform',
    catLabel:'Platform',
    desc:'A modern welcome page with a 1:1 AI video on the left and a chat interface. A beautiful landing experience before sign-in.',
    tags:['landing','video','chatbot'],
    features:[
      '1:1 aspect ratio video panel (loads 1.mp4)',
      'Live AI chatbot with auto-welcome sequence',
      'Animated orbs and grid background',
      'Get Started button → signinup.html',
      'Fully responsive with mobile menu'
    ],
    steps:[
      {t:'Chat with the AI assistant — it responds to greetings, questions and keywords.'},
      {t:'Click <strong>Get Started</strong> to go to the sign-in page.'},
      {t:'Use the navbar to navigate Home or Sign Up.'}
    ],
    shortcuts:[
      {k:'Enter',d:'Send chat message'}
    ]
  }
];

/* ============================================================
   STATE
   ============================================================ */
const state = {
  filter: 'all',
  query: ''
};

/* ============================================================
   DOM
   ============================================================ */
const grid = document.getElementById('toolGrid');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const sectionTitle = document.getElementById('sectionTitle');
const resultCount = document.getElementById('resultCount');
const heroToolCount = document.getElementById('heroToolCount');

const modalBackdrop = document.getElementById('modalBackdrop');
const modal = document.getElementById('modal');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalFile = document.getElementById('modalFile');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

/* ============================================================
   HELPERS
============================================================= */
const CATEGORY_LABELS = {
  all:'All Tools',
  color:'Color & AI',
  design:'Design Studios',
  image:'Image Editing',
  paint:'Painting & Art',
  creative:'Creative Tools',
  platform:'Platform'
};

function matchesFilter(tool){
  if (state.filter !== 'all' && tool.cat !== state.filter) return false;
  if (!state.query) return true;
  const q = state.query.toLowerCase();
  return (
    tool.name.toLowerCase().includes(q) ||
    tool.file.toLowerCase().includes(q) ||
    tool.desc.toLowerCase().includes(q) ||
    tool.catLabel.toLowerCase().includes(q) ||
    tool.tags.some(t => t.toLowerCase().includes(q)) ||
    tool.features.some(f => f.toLowerCase().includes(q))
  );
}

function escapeHtml(str){
  return String(str == null ? '' : str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ============================================================
   RENDER GRID
============================================================= */
function renderGrid(){
  const list = TOOLS.filter(matchesFilter);
  grid.innerHTML = '';

  if (list.length === 0){
    grid.innerHTML =
      '<div class="hb-empty">' +
        '<i class="fas fa-magnifying-glass"></i>' +
        '<h3>No tools found</h3>' +
        '<p>Try a different search term or select another category.</p>' +
      '</div>';
    resultCount.textContent = '0 tools';
    return;
  }

  list.forEach((tool, idx) => {
    const card = document.createElement('article');
    card.className = 'hb-card';
    card.style.animationDelay = (idx * 0.03) + 's';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.dataset.id = tool.id;

    const tagsHTML = tool.tags.slice(0, 3).map(t => '<span class="hb-tag">' + escapeHtml(t) + '</span>').join('');

    card.innerHTML =
      '<div class="hb-card-head">' +
        '<div class="hb-card-icon ' + tool.grad + '"><i class="fas ' + tool.icon + '"></i></div>' +
        '<div class="hb-card-meta">' +
          '<span class="hb-card-cat">' + escapeHtml(tool.catLabel) + '</span>' +
          '<h3>' + escapeHtml(tool.name) + '</h3>' +
          '<div class="hb-card-file">' + escapeHtml(tool.file) + '</div>' +
        '</div>' +
      '</div>' +
      '<p>' + escapeHtml(tool.desc) + '</p>' +
      '<div class="hb-card-foot">' +
        '<div class="hb-card-tags">' + tagsHTML + '</div>' +
        '<span class="hb-card-open"><i class="fas fa-arrow-right"></i></span>' +
      '</div>';

    card.addEventListener('click', () => openModal(tool));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openModal(tool); }
    });

    grid.appendChild(card);
  });

  resultCount.textContent = list.length + (list.length === 1 ? ' tool' : ' tools');
}

/* ============================================================
   OPEN MODAL
============================================================= */
function openModal(tool){
  modalIcon.className = 'hb-modal-icon ' + tool.grad;
  modalIcon.innerHTML = '<i class="fas ' + tool.icon + '"></i>';
  modalTitle.textContent = tool.name;
  modalFile.textContent = tool.file;

  let featuresHTML = '';
  if (tool.features && tool.features.length){
    featuresHTML =
      '<div class="hb-modal-section">' +
        '<div class="hb-modal-label"><i class="fas fa-star"></i> Key Features</div>' +
        '<div class="hb-features">' +
          tool.features.map(f =>
            '<div class="hb-feature"><i class="fas fa-check"></i><span>' + f + '</span></div>'
          ).join('') +
        '</div>' +
      '</div>';
  }

  let stepsHTML = '';
  if (tool.steps && tool.steps.length){
    stepsHTML =
      '<div class="hb-modal-section">' +
        '<div class="hb-modal-label"><i class="fas fa-list-ol"></i> How to Use</div>' +
        '<div class="hb-steps">' +
          tool.steps.map((s, i) =>
            '<div class="hb-step">' +
              '<span class="hb-step-num">' + (i+1) + '</span>' +
              '<span class="hb-step-txt">' + s.t + '</span>' +
            '</div>'
          ).join('') +
        '</div>' +
      '</div>';
  }

  let shortcutsHTML = '';
  if (tool.shortcuts && tool.shortcuts.length){
    shortcutsHTML =
      '<div class="hb-modal-section">' +
        '<div class="hb-modal-label"><i class="fas fa-keyboard"></i> Shortcuts</div>' +
        '<div class="hb-kbd-grid">' +
          tool.shortcuts.map(s =>
            '<div class="hb-kbd-item"><span>' + escapeHtml(s.d) + '</span><span class="hb-kbd">' + escapeHtml(s.k) + '</span></div>'
          ).join('') +
        '</div>' +
      '</div>';
  }

  const toolUrl = routeFor(tool.id, tool.file);

  modalBody.innerHTML =
    '<div class="hb-modal-section">' +
      '<div class="hb-modal-label"><i class="fas fa-circle-info"></i> About this Tool</div>' +
      '<p class="hb-modal-desc">' + escapeHtml(tool.desc) + '</p>' +
      '<div class="hb-card-tags">' +
        tool.tags.map(t => '<span class="hb-tag">' + escapeHtml(t) + '</span>').join('') +
      '</div>' +
    '</div>' +
    featuresHTML +
    stepsHTML +
    shortcutsHTML +
    '<div class="hb-modal-actions">' +
      '<a class="hb-modal-btn primary" href="' + toolUrl + '">' +
        '<i class="fas fa-arrow-up-right-from-square"></i> Open ' + escapeHtml(tool.name) +
      '</a>' +
      '<button class="hb-modal-btn ghost" id="modalCloseBtn2">' +
        '<i class="fas fa-xmark"></i> Close' +
      '</button>' +
    '</div>';

  modalBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  modal.scrollTop = 0;

  const closeBtn2 = document.getElementById('modalCloseBtn2');
  if (closeBtn2) closeBtn2.addEventListener('click', closeModal);
}

function closeModal(){
  modalBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) closeModal();
});

/* ============================================================
   FILTERS
============================================================= */
document.querySelectorAll('.hb-side-link[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.hb-side-link[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.filter = btn.dataset.filter;
    sectionTitle.textContent = CATEGORY_LABELS[state.filter] || 'Tools';
    renderGrid();
    // scroll to grid on mobile
    if (window.innerWidth <= 900){
      document.querySelector('.hb-section-head').scrollIntoView({behavior:'smooth', block:'start'});
    }
  });
});

/* ============================================================
   SEARCH
============================================================= */
searchInput.addEventListener('input', () => {
  state.query = searchInput.value.trim();
  searchClear.classList.toggle('show', state.query.length > 0);
  renderGrid();
});
searchClear.addEventListener('click', () => {
  searchInput.value = '';
  state.query = '';
  searchClear.classList.remove('show');
  renderGrid();
  searchInput.focus();
});

/* ============================================================
   NAV / HAMBURGER
============================================================= */
const hamburger = document.getElementById('hamburgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', e => {
  e.stopPropagation();
  hamburger.classList.toggle('active');
  mobileMenu.classList.toggle('open');
});
document.addEventListener('click', e => {
  if (!e.target.closest('.hb-nav')){
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('open');
  }
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('open');
  });
});

/* ============================================================
   COUNTS
============================================================= */
function updateCounts(){
  const counts = { all: TOOLS.length, color:0, design:0, image:0, paint:0, creative:0, platform:0 };
  TOOLS.forEach(t => { counts[t.cat] = (counts[t.cat] || 0) + 1; });
  document.getElementById('countAll').textContent = counts.all;
  document.getElementById('countColor').textContent = counts.color;
  document.getElementById('countDesign').textContent = counts.design;
  document.getElementById('countImage').textContent = counts.image;
  document.getElementById('countPaint').textContent = counts.paint;
  document.getElementById('countCreative').textContent = counts.creative;
  document.getElementById('countPlatform').textContent = counts.platform;
  heroToolCount.textContent = counts.all;
}

/* ============================================================
   INIT
============================================================= */
function init(){
  updateCounts();
  renderGrid();

  // Collapse sidebar on mobile by default
  if (window.innerWidth <= 900){
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.add('hb-collapsed');
  }
}

init();

console.log('%c📖 Helaberry · Studio Guide', 'color:#a29bfe;font-weight:800;font-size:15px;');
console.log('%c' + TOOLS.length + ' tools documented · 6 categories · Home button active', 'color:#6c85a0;font-size:12px;');

})();