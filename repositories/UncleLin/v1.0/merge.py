import sys
import os

html_path = 'index.html'
css_path = 'style.css'
js_path = 'game.js'
out_path = 'UncleLin_Mobile.html'

try:
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    with open(css_path, 'r', encoding='utf-8') as f:
        css_content = f.read()

    with open(js_path, 'r', encoding='utf-8') as f:
        js_content = f.read()

    html_content = html_content.replace(
        '<link rel="stylesheet" href="style.css">', 
        f'<style>\n{css_content}\n</style>'
    )

    html_content = html_content.replace(
        '<script src="game.js"></script>', 
        f'<script>\n{js_content}\n</script>'
    )

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print("Success")
except Exception as e:
    print("Error:", e)
