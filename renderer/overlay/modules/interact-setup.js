
import interact from 'interactjs';

import { updateCSSVariable } from './dom-elements';

export function setupInteractJS(textWrapper, fontSizeAdjuster, lineHeightAdjuster, settings) {
    setupTextWrapperInteraction(textWrapper, settings);
    setupFontSizeAdjusterInteraction(fontSizeAdjuster, settings);
    setupLineHeightAdjusterInteraction(lineHeightAdjuster, settings);
}

function setupTextWrapperInteraction(textWrapper, settings) {
    interact(textWrapper)
        .draggable({
            listeners: {
                move(event) {
                    if (settings.state !== 1) return;
                    settings.textBox.left += event.dx;
                    settings.textBox.top += event.dy;
                    updateCSSVariable("--text-box-left", `${settings.textBox.left}px`);
                    updateCSSVariable("--text-box-top", `${settings.textBox.top}px`);
                }
            }
        })
        .resizable({
            edges: { top: true, bottom: true, right: true, left: true },
            listeners: {
                move(event) {
                    if (settings.state !== 1) return;

                    if (event.edges.right) {
                        settings.textBox.width += event.dx;
                        updateCSSVariable("--text-box-width", `${settings.textBox.width}px`);
                    }
                    if (event.edges.bottom) {
                        settings.textBox.height += event.dy;
                        updateCSSVariable("--text-box-height", `${settings.textBox.height}px`);
                    }
                    if (event.edges.left) {
                        settings.textBox.left += event.dx;
                        settings.textBox.width -= event.dx;
                        updateCSSVariable("--text-box-left", `${settings.textBox.left}px`);
                        updateCSSVariable("--text-box-width", `${settings.textBox.width}px`);
                    }
                    if (event.edges.top) {
                        settings.textBox.top += event.dy;
                        settings.textBox.height -= event.dy;
                        updateCSSVariable("--text-box-top", `${settings.textBox.top}px`);
                        updateCSSVariable("--text-box-height", `${settings.textBox.height}px`);
                    }
                }
            },
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width: 50, height: 10 }
                })
            ]
        });
}

function setupFontSizeAdjusterInteraction(fontSizeAdjuster, settings) {
    interact(fontSizeAdjuster)
        .draggable({
            listeners: {
                move: createFontSizeDragMoveListener(settings)
            },
            inertia: false,
        });
}

function setupLineHeightAdjusterInteraction(lineHeightAdjuster, settings) {
    interact(lineHeightAdjuster)
        .draggable({
            listeners: {
                move: createLineHeightDragMoveListener(settings)
            },
            inertia: false,
        });
}


function createFontSizeDragMoveListener(settings) {
    return function fontSizeDragMoveListener(event) {
        const dy = event.dy;
        settings.fontSize -= dy * 0.01;
        settings.fontSize = Math.max(0.5, Math.min(3.0, settings.fontSize));
        updateCSSVariable("--font-size", `${settings.fontSize}rem`);
    };
}

function createLineHeightDragMoveListener(settings) {
    return function lineHeightDragMoveListener(event) {
        const dy = event.dy;
        settings.lineHeight -= dy * 0.01;
        settings.lineHeight = Math.max(0.7, Math.min(4.2, settings.lineHeight));
        settings.textBox.height = settings.textBox.lines * settings.lineHeight;
        updateCSSVariable("--text-box-height", `${settings.textBox.height}rem`);
        updateCSSVariable("--line-height", `${settings.lineHeight}rem`);
    };
}