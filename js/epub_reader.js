var book;
var rendition;
var displayed;

const ePubListeners = {};

// mutates global state variables
function loadePub(filenameOrBuffer) {
    book = ePub(filenameOrBuffer);
    rendition = book.renderTo("viewer", {
        width: "100%",
        height: "100%",
        spread: "always"
    });
    displayed = rendition.display();
    console.log(rendition);
}


loadePub("../data/welcome.epub");

document.addEventListener("DOMContentLoaded", function () {
    // create file handler
    var input = document.createElement('input');
    input.type = 'file';
    input.addEventListener("change", async function (e) {
        var file = e.target.files[0];
        // console.log(file);

        if (file.name.substring(file.name.length - 4) !== 'epub') {
            alert('Selected file is not an .epub file. Please open an .epub file.');
        }
        else {
            var buffer = await file.arrayBuffer();

            book.destroy();
            // clear all listeners on next, prev, rendition, etc.
            clearePubListeners(book, rendition);

            // load new epub
            loadePub(buffer);
            // re-create listeners
            initializeePubListeners(book, rendition, displayed);
        }


    });

    // create open file click listener
    var openFile = document.getElementById('openFile');
    openFile.addEventListener("click", function (event) {
        input.click();
    });

    // swiftread listener
    var swiftReadButton = document.getElementById('swiftread');
    swiftReadButton.addEventListener("click", function (event) {
        if (!document.getElementById('swiftread').className.includes('loading')) {
            document.getElementById('swiftread').className += ' loading';
        }
        openSwiftReadOnePub();
    });
});

initializeePubListeners(book, rendition, displayed);

function initializeePubListeners(book, rendition, displayed) {
    // create listeners
    book.ready.then(() => {

        // finish initializing epub reader

        var title = book.package.metadata.title;
        document.title = title;

        var next = document.getElementById("next");
        const nextClick = function (e) {
            book.package.metadata.direction === "rtl" ? rendition.prev() : rendition.next();
            e.preventDefault();
        };
        next.addEventListener("click", nextClick, false);
        ePubListeners['nextClick'] = { 'target': next, 'type': 'click', 'listener': nextClick };

        var prev = document.getElementById("prev");
        const prevClick = function (e) {
            book.package.metadata.direction === "rtl" ? rendition.next() : rendition.prev();
            e.preventDefault();
        };
        prev.addEventListener("click", prevClick, false);
        ePubListeners['prevClick'] = { 'target': prev, 'type': 'click', 'listener': prevClick };

        var keyListener = function (e) {
            // Left Key
            if ((e.keyCode || e.which) == 37) {
                book.package.metadata.direction === "rtl" ? rendition.next() : rendition.prev();
            }

            // Right Key
            if ((e.keyCode || e.which) == 39) {
                book.package.metadata.direction === "rtl" ? rendition.prev() : rendition.next();
            }
        };
        rendition.on("keyup", keyListener);
        document.addEventListener("keyup", keyListener, false);
        ePubListeners['documentKeyup'] = { 'target': document, 'type': 'keyup', 'listener': keyListener };

    })

    const renditionRendered = function (section) {
        var current = book.navigation && book.navigation.get(section.href);

        if (current) {
            var $select = document.getElementById("toc");
            var $selected = $select.querySelector("option[selected]");
            if ($selected) {
                $selected.removeAttribute("selected");
            }

            var $options = $select.querySelectorAll("option");
            for (var i = 0; i < $options.length; ++i) {
                let selected = $options[i].getAttribute("ref") === current.href;
                if (selected) {
                    $options[i].setAttribute("selected", "");
                }
            }
        }

    };
    rendition.on("rendered", renditionRendered);

    const renditionRelocated = function (location) {
        // console.log(location);

        var next = book.package.metadata.direction === "rtl" ? document.getElementById("prev") : document.getElementById("next");
        var prev = book.package.metadata.direction === "rtl" ? document.getElementById("next") : document.getElementById("prev");

        if (location.atEnd) {
            next.style.visibility = "hidden";
        } else {
            next.style.visibility = "visible";
        }

        if (location.atStart) {
            prev.style.visibility = "hidden";
        } else {
            prev.style.visibility = "visible";
        }

    };
    rendition.on("relocated", renditionRelocated);

    const renditionLayout = function (layout) {
        let viewer = document.getElementById("viewer");

        if (layout.spread) {
            viewer.classList.remove('single');
        } else {
            viewer.classList.add('single');
        }
    };
    rendition.on("layout", renditionLayout);

    const windowUnload = function () {
        console.log("unloading");
        this.book.destroy();
    };
    window.addEventListener("unload", windowUnload);
    ePubListeners['windowUnload'] = { 'target': window, 'type': 'unload', 'listener': windowUnload };

    book.loaded.navigation.then(function (toc) {
        var $select = document.getElementById("toc"),
            docfrag = document.createDocumentFragment();

        // clear any existing options in the TOC select
        while ($select.options.length > 0) {
            $select.remove(0);
        }

        toc.forEach(function (chapter) {
            var option = document.createElement("option");
            option.textContent = chapter.label;
            option.setAttribute("ref", chapter.href);

            docfrag.appendChild(option);
        });

        $select.appendChild(docfrag);

        const selectOnchange = function () {
            var index = $select.selectedIndex,
                url = $select.options[index].getAttribute("ref");
            rendition.display(url);
            return false;
        };
        $select.onchange = selectOnchange;
        ePubListeners['selectOnchange'] = { 'target': $select, 'type': 'change', 'listener': selectOnchange };

    });
    // console.log('ePubListeners: ', ePubListeners);
}
function clearePubListeners() {

    for (const [key, obj] of Object.entries(ePubListeners)) {
        var target = obj['target'];
        // console.log(`${key}`);
        // console.log('target:', target);
        target.removeEventListener(obj['type'], obj['listener']);
    }

}

