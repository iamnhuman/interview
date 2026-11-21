"""Generate static link previews for individual interview questions."""

from html import escape
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import urljoin


class Interview(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.metadata = {}
        self.questions = {}
        self.question_id = None
        self.capture = None
        self.text = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        identifier = attributes.get("id", "")
        classes = attributes.get("class", "").split()
        if tag in ("div", "section") and re.fullmatch(r"question-\d+", identifier):
            self.question_id = identifier
        if tag == "meta" and attributes.get("property", "").startswith("og:"):
            self.metadata[attributes["property"]] = attributes.get("content", "")
        if tag == "title" or (tag in ("h2", "h3") and "question-copy" in classes):
            self.capture = tag
            self.text = []

    def handle_data(self, text):
        if self.capture:
            self.text.append(text)

    def handle_endtag(self, tag):
        if tag != self.capture:
            return
        text = " ".join("".join(self.text).split())
        if tag == "title":
            self.title = text
        else:
            if not self.question_id or self.question_id in self.questions:
                raise ValueError("Question heading must have a unique question ID")
            self.questions[self.question_id] = text
            self.question_id = None
        self.capture = None


def question_page(interview, identifier, question, url):
    title = escape(interview.title)
    description = escape(question)
    metadata = {
        "og:type": "article",
        "og:url": url,
        "og:title": interview.title,
        "og:description": question,
        **{key: value for key, value in interview.metadata.items() if key.startswith("og:image")},
    }
    tags = "\n".join(f'  <meta property="{key}" content="{escape(value)}">' for key, value in metadata.items())
    return f'''<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <link rel="canonical" href="{escape(url)}">
{tags}
</head>
<body>
  <p>{description}</p>
  <a href="../../index.html#{identifier}">Открыть вопрос в интервью</a>
  <script>location.replace(document.querySelector("a").href);</script>
</body>
</html>
'''


def main():
    root = Path(__file__).resolve().parents[1]
    interview = Interview()
    interview.feed((root / "index.html").read_text(encoding="utf-8"))
    interview.close()
    if not interview.title or not interview.questions:
        raise ValueError("Interview title or questions are missing")
    for identifier, question in interview.questions.items():
        number = identifier.removeprefix("question-")
        route = f"q/{number}/"
        destination = root / route / "index.html"
        destination.parent.mkdir(parents=True, exist_ok=True)
        url = urljoin(interview.metadata["og:url"], route)
        destination.write_text(question_page(interview, identifier, question, url), encoding="utf-8")
    print(f"Generated {len(interview.questions)} question previews")


if __name__ == "__main__":
    main()
