/**
 * Aba Placeholders + menu "inserir placeholder" no editor de perfil.
 * Requer: app-state (namespace MOptions).
 */

window.MOptions = window.MOptions || {};

MOptions.initPlaceholders = function () {
    const {
        placeholdersList,
        addPlaceholderBtn,
        insertPlaceholderBtn,
        optionsPlaceholderMenu,
        profileEditor
    } = MOptions.refs;

    function renderPlaceholders() {
        placeholdersList.innerHTML = '';

        if (!MOptions.state.placeholders || MOptions.state.placeholders.length === 0) {
            placeholdersList.innerHTML = '<li class="site-item empty">Nenhum placeholder personalizado. Adicione abaixo ou use <code>{{data}}</code>.</li>';
            return;
        }

        MOptions.state.placeholders.forEach((placeholder, index) => {
            const li = document.createElement('li');
            li.className = 'site-item';

            const fields = document.createElement('div');
            fields.className = 'ph-fields';

            const keyInput = document.createElement('input');
            keyInput.className = 'ph-key';
            keyInput.value = placeholder.key;
            keyInput.placeholder = 'chave';
            keyInput.setAttribute('aria-label', 'Chave do placeholder');

            const valueInput = document.createElement('input');
            valueInput.className = 'ph-value';
            valueInput.value = placeholder.value;
            valueInput.placeholder = 'valor substituído';
            valueInput.setAttribute('aria-label', 'Valor do placeholder');

            const commit = () => {
                MOptions.state.placeholders[index] = { key: keyInput.value.trim(), value: valueInput.value };
                MOptions.persistState(() => MOptions.showStatus('Placeholder salvo.'));
                logAction('Placeholder salvo.', MOptions.renderHistory);
            };
            keyInput.addEventListener('change', commit);
            valueInput.addEventListener('change', commit);

            fields.appendChild(keyInput);
            fields.appendChild(valueInput);

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remover';
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn-danger';
            removeBtn.onclick = () => {
                const removedKey = placeholder.key;
                MOptions.state.placeholders.splice(index, 1);
                MOptions.persistState(() => {
                    renderPlaceholders();
                    MOptions.showStatus('Placeholder removido.');
                    logAction(`Placeholder removido: {{${removedKey}}}`, MOptions.renderHistory);
                });
            };

            li.appendChild(fields);
            li.appendChild(removeBtn);
            placeholdersList.appendChild(li);
        });
    }

    addPlaceholderBtn.addEventListener('click', () => {
        MOptions.state.placeholders.push({ key: '', value: '' });
        renderPlaceholders();
        const keyInputs = placeholdersList.querySelectorAll('.ph-key');
        const last = keyInputs[keyInputs.length - 1];
        if (last) last.focus();
    });

    insertPlaceholderBtn.addEventListener('click', () => {
        profileEditor.focus();

        const items = [{ key: 'data' }].concat(MOptions.state.placeholders || []);
        if (optionsPlaceholderMenu.style.display === 'block' && optionsPlaceholderMenu.dataset.filled === '1') {
            optionsPlaceholderMenu.style.display = 'none';
            return;
        }

        optionsPlaceholderMenu.innerHTML = '';
        optionsPlaceholderMenu.dataset.filled = '1';

        items.forEach((placeholder) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'ph-menu-item';
            item.textContent = `{{${placeholder.key}}}`;
            item.setAttribute('role', 'menuitem');
            item.addEventListener('mousedown', (e) => e.preventDefault());
            item.addEventListener('click', () => {
                document.execCommand('insertText', false, `{{${placeholder.key}}}`);
                optionsPlaceholderMenu.style.display = 'none';
                profileEditor.focus();
            });
            optionsPlaceholderMenu.appendChild(item);
        });

        optionsPlaceholderMenu.style.display = 'block';
    });

    document.addEventListener('mousedown', (e) => {
        if (!optionsPlaceholderMenu.contains(e.target) && !insertPlaceholderBtn.contains(e.target)) {
            optionsPlaceholderMenu.style.display = 'none';
        }
    });

    MOptions.renderPlaceholders = renderPlaceholders;
};