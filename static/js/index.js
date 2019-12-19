let tippyIndex = 0;

function toggleTooltips(currentId, nextId, advanceIndex) {
    document.getElementById(currentId)._tippy.hide();
    document.getElementById(nextId)._tippy.show();
    if (advanceIndex) {
        tippyIndex++;
    }
}

function fillSpanAndToggleTooltips(id, nextId, value) {
    const span = document.getElementById(id);
    span.innerText = value;
    span.classList.remove('removed', 'marker');
    toggleTooltips(id, nextId, false);
}

function generateTippyContent(id, nextId, part) {
    return (
`<div style="text-align: center">
    <div>
        "${part.value}" was
        <span style="color: ${part.added ? 'greenyellow' : 'red'}">
            ${part.added ? 'ADDED' : 'REMOVED'}
        </span>
    </div>
    <button onclick="toggleTooltips('${id}', '${nextId}', true)">Accept</button>
    <button onclick="fillSpanAndToggleTooltips('${id}', '${nextId}', '${part.added ? "" : part.value}')">Reject</button>
</div>`
    )
}

function cleanText(content) {
    // replace non-breaking spaces with spaces
    return content.replace(/\s/g, " ");
}

function generate_id() {
    // https://gist.github.com/gordonbrander/2230317
    return `i${Math.random().toString(36).substr(2, 9)}`;
}


document.addEventListener("DOMContentLoaded", function() {
    const text1 = document.getElementById("text1");
    const text2 = document.getElementById("text2");
    const text3 = document.getElementById("text3");

    const range = document.createRange();
    const sel = window.getSelection();
    let tippies = [];

    function moveTextCursor(node, position) {
        range.setStart(node, position);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }

    function getCursorPosition(elem) {
        let cursorPosition = null;
        if (sel.rangeCount) {
            const selRange = sel.getRangeAt(0);
            const cursorNode = selRange.startContainer;
            cursorPosition = selRange.startOffset;
            for (let child of elem.childNodes) {
                if (child.textContent === cursorNode.textContent) {
                    break;
                }
                cursorPosition += child.textContent.length;
            }
        }
        return cursorPosition;
    }

    function setCursorPosition(elem, position) {
        for (let child of elem.childNodes) {
            if (position - child.textContent.length < 0) {
                moveTextCursor(
                    [...child.childNodes].filter(
                        node => node.nodeType === Node.TEXT_NODE
                    )[0] || child,
                    position
                );
                break;
            }
            else {
                position -= child.textContent.length;
            }
        }
    }

    function getCheckedRadioValue(name) {
        for (let elem of document.getElementsByName(name)) {
            if (elem.checked) {
                return elem.value;
            }
        }
    }

    function destroyAllTippies() {
        tippies.forEach(tippy => tippy.destroy());
        tippies.length = 0;
    }

    function diffIt() {
        destroyAllTippies();

        const diffType = getCheckedRadioValue("diff-type");
        const addBreaks = document.getElementById("add-breaks").checked;
        const diff = {
            char: Diff.diffChars,
            word: Diff.diffWords,
        }[diffType](
            cleanText(text1.textContent),
            cleanText(text2.textContent)
        );
        const br = addBreaks ? "<br/>" : "";
        let text1_content = "", text2_content = "", text3_content = "";

        const cursorPosition = getCursorPosition(text2);

        const ids2part = {};
        diff.forEach((part) => {
            if (part.added) {
                const id = generate_id();
                ids2part[id] = part;
                text2_content += `<span id="${id}" class="added">${part.value}</span>${br}`;
                text3_content += `<span class="added">${part.value}</span>${br}`;
                text1_content += `<span class="added marker"></span>${br}`;
            }
            else if (part.removed) {
                const id = generate_id();
                ids2part[id] = part;
                const content = `<span class="removed">${part.value}</span>${br}`;
                text1_content += content;
                text3_content += content;
                text2_content += `<span id="${id}" class="removed marker"></span>${br}`;
            }
            else {
                text1_content += part.value;
                text2_content += part.value;
                text3_content += part.value;
            }
        });
        text1.innerHTML = text1_content;
        text2.innerHTML = text2_content;
        text3.innerHTML = text3_content;

        // add tooltips
        Object.keys(ids2part).forEach((id, i) => {
            const part = ids2part[id];
            const nextId = Object.keys(ids2part)[i + 1];
            const tips = tippy(`#${id}`, {
                content: generateTippyContent(id, nextId, part),
                placement: 'bottom',
                arrow: true,
                interactive: true,
                hideOnClick: false,
                trigger: 'manual',
            });
            tippies = tippies.concat(tips);
            if (i === tippyIndex) {
                tips[0].show();
            }
        });

        if (cursorPosition) {
            setCursorPosition(text2, cursorPosition);
        }
    }

    function cycle(current, max, moveForward) {
        return (current + (moveForward ? 1 : -1) + max) % max;
    }

    const spanIndices = {};

    /**
     * Cycle through spans and move cursor to the left of the first character of a span.
     */
    function moveToAdjacentSpan(e) {
        const targetId = e.target.id;
        if (e.key === "PageDown" || e.key === "PageUp") {
            e.preventDefault();
            const numChildren = e.target.children.length;
            let spanIndex = spanIndices[targetId] === undefined ? -1 : spanIndices[targetId];
            spanIndex = cycle(spanIndex, numChildren, e.key === "PageDown");
            spanIndices[targetId] = spanIndex;
            const span = e.target.children[spanIndex];
            const prevSpan = e.target.children[cycle(spanIndex, numChildren, e.key !== "PageDown")];
            prevSpan.classList.remove("active");
            span.classList.add("active");
            moveTextCursor(span, 0);
        }
        // TODO: underline spans from other texts
    }

    for (let diffType of document.getElementsByName("diff-type")) {
        diffType.addEventListener("change", diffIt)
    }
    document.getElementById("add-breaks").addEventListener("change", diffIt);

    diffIt();
    text2.addEventListener('keydown', moveToAdjacentSpan);
    text2.addEventListener('input', diffIt);

    // submit button
    document.getElementById('submit').addEventListener('click', async () => {
        destroyAllTippies();  // so that tippy content is not included
        const response = await fetch(
            '/save',
            {
                method: 'POST',
                body: text2.textContent,
            }
        );
    });
});
