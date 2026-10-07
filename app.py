import os
import re
import inspect
from flask import Flask, render_template, send_from_directory

app = Flask(__name__,
            static_folder='static',
            template_folder='templates',
            static_url_path='/static')

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')


# ================================================================
#  SAFE RENDER — friendly page if a template is missing
# ================================================================
def safe_render(template_name, **ctx):
    full = os.path.join(TEMPLATE_DIR, template_name)
    if not os.path.exists(full):
        return (
            "<html><head><title>Missing template</title></head>"
            "<body style='font-family:system-ui;background:#0f1115;color:#eee;"
            "padding:40px;line-height:1.6'>"
            f"<h1>⚠️ Template not found</h1>"
            f"<p><code>templates/{template_name}</code> does not exist yet.</p>"
            f"<p>Create that file in your <code>templates/</code> folder, "
            f"or update <code>app.py</code> to point at an existing one.</p>"
            f"<p><a style='color:#7c9cff' href='/homepage'>← back to homepage</a></p>"
            f"</body></html>", 404
        )
    return render_template(template_name, **ctx)


# ================================================================
#  ROOT / WELCOME / AUTH
# ================================================================
@app.route('/')
def welcome():
    return safe_render('index.html')

@app.route('/homepage')
def homepage():
    return safe_render('homepage.html')

@app.route('/home')
def home():
    return safe_render('homepage.html')

@app.route('/index')
def index():
    return safe_render('index.html')

@app.route('/signinup')
def signinup():
    return safe_render('signinup.html')

@app.route('/signup')
def signup():
    return safe_render('signinup.html')

@app.route('/dashboard')
def main_dashboard():
    return safe_render('main.html')

@app.route('/main')
def main_alias():
    return safe_render('main.html')


# ================================================================
#  DESIGN HUB
# ================================================================
@app.route('/designhub')
def design_hub():
    return safe_render('ColorMixGame.html')


# ================================================================
#  COLOR & AI TOOLS
# ================================================================
@app.route('/prompt-palette')
def tool_ai_prompt_palette():
    return safe_render('AI prompt palette.html')

@app.route('/color-compass')
def tool_color_compass():
    return safe_render('Discover color meanings.html')

@app.route('/full-breakdown')
def tool_full_breakdown():
    return safe_render('Full Color Breakdown.html')

@app.route('/main-extractor')
def tool_main_extractor():
    return safe_render('Main Color Extractor.html')

@app.route('/helaplatte')
def tool_hela_platte():
    return safe_render('HelaPlatte.html')


# ================================================================
#  DESIGN STUDIOS
# ================================================================
@app.route('/design-studio')
def tool_design_studio():
    return safe_render('Design Studio.html')

@app.route('/helaui')
def tool_hela_ui():
    return safe_render('helaui.html')

@app.route('/mandala')
def tool_mandala_studio():
    return safe_render('mandela.html')

@app.route('/vectorforge')
def tool_vectorforge():
    return safe_render('vectot.html')

@app.route('/linelab')
def tool_line_lab():
    return safe_render('LineLab.html')


# ================================================================
#  IMAGE EDITING
# ================================================================
@app.route('/image-studio')
def image_studio():
    return safe_render('bg.html')

@app.route('/helacanvas')
def tool_pixelforge():
    return safe_render('HelaCanvas.html')


# ================================================================
#  PAINTING & ART
# ================================================================
@app.route('/paint')
def tool_live_painting():
    return safe_render('paint.html')

@app.route('/linepro')
def tool_line_pro():
    return safe_render('LinePro.html')


# ================================================================
#  CREATIVE TOOLS
# ================================================================
@app.route('/fashion')
def tool_fashion_matcher():
    return safe_render('fashion.html')

@app.route('/interior')
def interior():
    return safe_render('interiol.html')

@app.route('/color-mix')
def tool_color_mix():
    return safe_render('ColorMixGame.html')

@app.route('/color-mix-game')
def tool_color_mix_game():
    return safe_render('ColorMixGame.html')

# FIX: the endpoint the ColorMixGame.html template calls
@app.route('/color-boom')
def tool_color_boom():
    # If ColorBoom.html exists, use it; otherwise fall back to the
    # ColorMixGame page so the button link works.
    if os.path.exists(os.path.join(TEMPLATE_DIR, 'ColorBoom.html')):
        return safe_render('ColorBoom.html')
    return safe_render('ColorMixGame.html')

# FIX: the true ColorMix.html tool (Object-Aware Line Art Colorizer)
@app.route('/colormix')
def tool_colormix():
    if os.path.exists(os.path.join(TEMPLATE_DIR, 'ColorMix.html')):
        return safe_render('ColorMix.html')
    return safe_render('ColorMixGame.html')

# FIX: ChromaFill and HelaFill aliases referenced by guide.html
@app.route('/chromafill')
def tool_chromafill():
    return safe_render('ColorMix.html')

@app.route('/hela-fill')
def tool_hela_fill():
    return safe_render('ColorMix.html')

@app.route('/sign')
def sign_studio():
    return safe_render('sign.html')


# ================================================================
#  GUIDE
# ================================================================
@app.route('/guide')
def guide():
    return safe_render('guide.html')


# ================================================================
#  EXTRA STATIC FOLDERS  (serves /src/logo.png, /src/1.mp4, etc.)
# ================================================================
@app.route('/src/<path:filename>')
def src_files(filename):
    return send_from_directory('src', filename)

@app.route('/styles/<path:filename>')
def styles_files(filename):
    return send_from_directory('styles', filename)

@app.route('/model/<path:filename>')
def model_files(filename):
    return send_from_directory('model', filename)


# ================================================================
#  DEBUG: list every route + whether its template exists
#  Visit http://127.0.0.1:5000/_routes  while the dev server is running
# ================================================================
@app.route('/_routes')
def _routes():
    rows = []
    for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
        if rule.endpoint.startswith('static') or rule.endpoint.startswith('_'):
            continue
        fn = app.view_functions[rule.endpoint]
        template = '—'
        exists = ''
        try:
            src = inspect.getsource(fn)
            m = re.search(r"(?:render_template|safe_render)\(\s*['\"]([^'\"]+)['\"]", src)
            if m:
                template = m.group(1)
                exists = '✅' if os.path.exists(
                    os.path.join(TEMPLATE_DIR, template)) else '❌'
        except Exception:
            pass
        rows.append(f"<tr><td>{rule.rule}</td><td>{rule.endpoint}</td>"
                    f"<td>{template}</td><td>{exists}</td></tr>")
    html = (
        "<html><head><title>Routes</title></head><body style='"
        "font-family:system-ui;background:#0f1115;color:#eee;padding:20px'>"
        "<h1>All routes</h1>"
        "<table border=1 cellpadding=6 cellspacing=0 style='border-collapse:collapse'>"
        "<tr><th>URL</th><th>Endpoint</th><th>Template</th><th>Exists</th></tr>"
        + "".join(rows) + "</table></body></html>")
    return html


if __name__ == '__main__':
    app.run(debug=True, port=5000)