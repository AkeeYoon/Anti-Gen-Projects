import os

base_dir = r"c:\Users\D30\.gemini\PJArea\ProjectionMappingTool"
out_path = r"c:\Users\D30\.gemini\PJArea\Portable_ProjectionMappingTool.html"

def read_utf8(path):
    with open(path, 'r', encoding='utf-8-sig') as f:
        return f.read()

html = read_utf8(os.path.join(base_dir, 'index.html'))
css = read_utf8(os.path.join(base_dir, r'css\styles.css'))
js_calc = read_utf8(os.path.join(base_dir, r'js\calculator.js'))
js_canvas = read_utf8(os.path.join(base_dir, r'js\canvasEngine.js'))
js_export = read_utf8(os.path.join(base_dir, r'js\exporter.js'))
js_main = read_utf8(os.path.join(base_dir, r'js\main.js'))

# Replace CSS
html = html.replace('<link rel="stylesheet" href="css/styles.css">', f'<style>\n{css}\n    </style>')

# Combine JS and replace
js_all = f"{js_calc}\n{js_canvas}\n{js_export}\n{js_main}"

# Simple regex replace for script tags
import re
html = re.sub(
    r'<script src="js/calculator\.js"></script>.*?<script src="js/main\.js"></script>',
    f'<script>\n{js_all}\n    </script>',
    html,
    flags=re.DOTALL
)

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(html)
    
print("Merged with Python")
