/**
 * Sanitiza HTML colado ou armazenado, mantendo apenas negrito, itálico,
 * sublinhado, links e quebras de linha.
 *
 * Remove SEMPRE: estilos inline, atributos "style"/"class"/"size" e tags
 * como <span>, <font>, <div>, <svg> etc. É isso que evita o bug do emoji
 * "absurdamente grande": o HTML copiado de assinaturas de e-mail (Gmail,
 * Outlook, geradores como WiseStamp/HubSpot) costuma trazer o emoji dentro
 * de <span style="font-size:28px">📱</span> ou como imagem
 * (<img alt="📱">, sem limite de tamanho definido). Como nada filtrava
 * esse HTML, o tamanho ficava salvo e era reinjetado do mesmo jeito no
 * Jira. O emoji em si é sempre preservado: <img> com "alt" é convertido de
 * volta para o caractere de texto, que passa a herdar o tamanho normal da
 * fonte do editor.
 *
 * Usado tanto no popup (ao colar/salvar) quanto no content script
 * (antes de injetar a assinatura salva no Jira, como segunda camada de
 * proteção — inclusive corrige sozinha assinaturas antigas já corrompidas).
 *
 * Observação: usa `document`, portanto NÃO deve ser chamado no Service
 * Worker (background). Lá o HTML é preservado sem sanitização.
 */
function sanitizeSignatureHtml(html) {
    if (!html) return '';

    const ALLOWED_TAGS = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, A: 1, BR: 1 };
    const REMOVE_ENTIRELY = {
        SCRIPT: 1, STYLE: 1, SVG: 1, IFRAME: 1,
        OBJECT: 1, EMBED: 1, CANVAS: 1, VIDEO: 1, AUDIO: 1
    };

    const template = document.createElement('template');
    template.innerHTML = html;

    function clean(parent) {
        Array.from(parent.childNodes).forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) return;

            if (node.nodeType !== Node.ELEMENT_NODE) {
                node.remove();
                return;
            }

            const tag = node.tagName;

            if (tag === 'IMG') {
                const emojiChar = node.getAttribute('alt') || node.getAttribute('title') || '';
                if (emojiChar) {
                    parent.replaceChild(document.createTextNode(emojiChar), node);
                } else {
                    node.remove();
                }
                return;
            }

            if (REMOVE_ENTIRELY[tag]) {
                node.remove();
                return;
            }

            clean(node);

            if (ALLOWED_TAGS[tag]) {
                const href = tag === 'A' ? node.getAttribute('href') : null;
                Array.from(node.attributes).forEach((attr) => node.removeAttribute(attr.name));
                if (href) {
                    node.setAttribute('href', href);
                    node.setAttribute('target', '_blank');
                    node.setAttribute('rel', 'noopener noreferrer');
                }
            } else {
                while (node.firstChild) parent.insertBefore(node.firstChild, node);
                node.remove();
            }
        });
    }

    clean(template.content);
    return template.innerHTML;
}