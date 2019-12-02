from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
    with open("lorem1.txt") as lorem1, open("lorem2.txt") as lorem2:
        return render_template(
            "index.html",
            text1=lorem1.read(),
            text2=lorem2.read(),
        )


if __name__ == "__main__":
    app.run()
