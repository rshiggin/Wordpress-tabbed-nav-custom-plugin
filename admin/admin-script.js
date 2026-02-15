// admin/admin-script.js

(function($) {
    'use strict';

    let currentEditId = '';
    let tabCounter = 0;

    // ========================
    // INITIALIZATION
    // ========================

    $(document).ready(function() {
        bindEvents();
    });

    function bindEvents() {
        // Sidebar actions
        $('#create-new-tab-set').on('click', createNewTabSet);
        $(document).on('click', '.edit-tab-set', function() {
            loadTabSet($(this).data('id'));
        });
        $(document).on('click', '.delete-tab-set', function() {
            deleteTabSet($(this).data('id'));
        });

        // Editor actions
        $('#add-tab-btn').on('click', addNewTab);
        $(document).on('click', '.remove-tab-btn', removeTab);
        $(document).on('click', '.toggle-tab-btn', toggleTabBody);
        $('#tab-set-form').on('submit', saveTabSet);
        $('#cancel-edit').on('click', cancelEdit);
        $('#copy-shortcode').on('click', copyShortcode);

        // Live preview updates
        $(document).on('input keyup', '.tab-title-input', updatePreview);
        $(document).on('input keyup', '.tab-content-textarea', updatePreview);

        // Drag and drop
        initDragAndDrop();
    }

    // ========================
    // CREATE NEW TAB SET
    // ========================

    function createNewTabSet() {
        currentEditId = '';
        $('#editing-tab-set-id').val('');
        $('#tab-set-name').val('');
        $('#editor-title').text('New Tab Set');
        $('#shortcode-copy-area').hide();
        $('#tabs-container').empty();
        tabCounter = 0;

        // Add two default tabs
        addTab('Tab One', '<p>Enter content for tab one here.</p>');
        addTab('Tab Two', '<p>Enter content for tab two here.</p>');

        showEditor();
        updatePreview();
    }

    // ========================
    // LOAD EXISTING TAB SET
    // ========================

    function loadTabSet(id) {
        $.post(customTabsAdmin.ajax_url, {
            action: 'get_tab_set',
            nonce: customTabsAdmin.nonce,
            tab_set_id: id
        }, function(response) {
            if (response.success) {
                const data = response.data;
                currentEditId = data.id;
                $('#editing-tab-set-id').val(data.id);
                $('#tab-set-name').val(data.name);
                $('#editor-title').text('Edit: ' + data.name);

                // Show shortcode
                const shortcode = '[custom_tabs id="' + data.id + '"]';
                $('#shortcode-output').val(shortcode);
                $('#shortcode-copy-area').show();

                // Load tabs
                $('#tabs-container').empty();
                tabCounter = 0;
                data.tabs.forEach(function(tab) {
                    addTab(tab.title, tab.content);
                });

                // Highlight active in sidebar
                $('.tab-set-item').removeClass('active');
                $('.tab-set-item[data-id="' + id + '"]').addClass('active');

                showEditor();
                updatePreview();
            }
        });
    }

    // ========================
    // SAVE TAB SET
    // ========================

    function saveTabSet(e) {
        e.preventDefault();

        const name = $('#tab-set-name').val().trim();
        if (!name) {
            alert('Please enter a tab set name.');
            return;
        }

        const tabs = [];
        $('#tabs-container .tab-editor-item').each(function() {
            const title = $(this).find('.tab-title-input').val().trim();
            const content = $(this).find('.tab-content-textarea').val();
            if (title) {
                tabs.push({ title: title, content: content });
            }
        });

        if (tabs.length === 0) {
            alert('Please add at least one tab.');
            return;
        }

        const postData = {
            action: 'save_tab_set',
            nonce: customTabsAdmin.nonce,
            tab_set_id: currentEditId,
            tab_set_name: name,
            tabs: tabs
        };

        $('#save-tab-set').prop('disabled', true).text('Saving...');

        $.post(customTabsAdmin.ajax_url, postData, function(response) {
            $('#save-tab-set').prop('disabled', false).text('Save Tab Set');

            if (response.success) {
                currentEditId = response.data.id;
                $('#editing-tab-set-id').val(currentEditId);

                const shortcode = '[custom_tabs id="' + currentEditId + '"]';
                $('#shortcode-output').val(shortcode);
                $('#shortcode-copy-area').show();
                $('#editor-title').text('Edit: ' + name);

                // Show saved status
                $('#save-status').text('✓ Saved!').fadeIn();
                setTimeout(function() {
                    $('#save-status').fadeOut();
                }, 3000);

                // Refresh sidebar
                refreshSidebar(currentEditId);
            } else {
                alert('Error saving. Please try again.');
            }
        });
    }

    // ========================
    // DELETE TAB SET
    // ========================

    function deleteTabSet(id) {
        if (!confirm('Are you sure you want to delete this tab set? This cannot be undone.')) {
            return;
        }

        $.post(customTabsAdmin.ajax_url, {
            action: 'delete_tab_set',
            nonce: customTabsAdmin.nonce,
            tab_set_id: id
        }, function(response) {
            if (response.success) {
                $('.tab-set-item[data-id="' + id + '"]').fadeOut(300, function() {
                    $(this).remove();
                    if ($('#tab-sets-list .tab-set-item').length === 0) {
                        $('#tab-sets-list').html('<li class="no-tab-sets">No tab sets yet. Create one!</li>');
                    }
                });

                if (currentEditId === id) {
                    cancelEdit();
                }
            }
        });
    }

    // ========================
    // TAB MANAGEMENT
    // ========================

    function addNewTab() {
        addTab('New Tab', '<p>Enter content here.</p>');
        updatePreview();
        // Scroll to new tab
        const container = $('#tabs-container');
        container.animate({ scrollTop: container.prop('scrollHeight') }, 300);
    }

    function addTab(title, content) {
        tabCounter++;
        const index = tabCounter;

        const html = `
            <div class="tab-editor-item" data-tab-index="${index}" draggable="true">
                <div class="tab-editor-header">
                    <span class="drag-handle dashicons dashicons-menu"></span>
                    <span class="tab-number">Tab ${$('#tabs-container .tab-editor-item').length + 1}</span>
                    <span class="tab-title-preview">${escapeHtml(title)}</span>
                    <button type="button" class="toggle-tab-btn dashicons dashicons-arrow-down-alt2" title="Toggle"></button>
                    <button type="button" class="remove-tab-btn dashicons dashicons-trash" title="Remove Tab"></button>
                </div>
                <div class="tab-editor-body">
                    <label>Tab Title</label>
                    <input type="text" class="tab-title-input" value="${escapeAttr(title)}" placeholder="Enter tab title">
                    
                    <label>Tab Content</label>
                    <textarea class="tab-content-textarea" placeholder="Enter tab content (HTML allowed)">${escapeHtml(content)}</textarea>
                </div>
            </div>
        `;

        $('#tabs-container').append(html);
        renumberTabs();
    }

    function removeTab() {
        const item = $(this).closest('.tab-editor-item');
        const totalTabs = $('#tabs-container .tab-editor-item').length;

        if (totalTabs <= 1) {
            alert('You must have at least one tab.');
            return;
        }

        item.fadeOut(200, function() {
            $(this).remove();
            renumberTabs();
            updatePreview();
        });
    }

    function toggleTabBody() {
        const body = $(this).closest('.tab-editor-item').find('.tab-editor-body');
        body.toggleClass('collapsed');
        $(this).toggleClass('collapsed');
    }

    function renumberTabs() {
        $('#tabs-container .tab-editor-item').each(function(i) {
            $(this).find('.tab-number').text('Tab ' + (i + 1));
        });
    }

    // ========================
    // LIVE PREVIEW
    // ========================

    function updatePreview() {
        const tabs = [];
        $('#tabs-container .tab-editor-item').each(function() {
            tabs.push({
                title: $(this).find('.tab-title-input').val() || 'Untitled',
                content: $(this).find('.tab-content-textarea').val() || ''
            });
        });

        if (tabs.length === 0) {
            $('#live-preview').html('<p class="description">Add tabs to see a preview.</p>');
            return;
        }

        let tablistHtml = '<div class="tabs__tablist">';
        let panelsHtml = '';

        tabs.forEach(function(tab, i) {
            const activeClass = i === 0 ? ' preview-active' : '';
            tablistHtml += `<button type="button" class="tabs__tab${activeClass}" data-preview-tab="${i}">${escapeHtml(tab.title)}</button>`;

            const visibleClass = i === 0 ? ' preview-visible' : '';
            panelsHtml += `<div class="tabs__panel${visibleClass}" data-preview-panel="${i}">${tab.content}</div>`;
        });

        tablistHtml += '</div>';

        const previewHtml = `<div class="tabs">${tablistHtml}${panelsHtml}</div>`;
        $('#live-preview').html(previewHtml);

        // Bind preview tab clicks
        $('#live-preview').find('[data-preview-tab]').on('click', function() {
            const idx = $(this).data('preview-tab');
            $('#live-preview .tabs__tab').removeClass('preview-active');
            $('#live-preview .tabs__panel').removeClass('preview-visible');
            $(this).addClass('preview-active');
            $('#live-preview [data-preview-panel="' + idx + '"]').addClass('preview-visible');
        });

        // Also update the title preview in the header
        $('#tabs-container .tab-editor-item').each(function() {
            const title = $(this).find('.tab-title-input').val() || 'Untitled';
            $(this).find('.tab-title-preview').text(title);
        });
    }

    // ========================
    // DRAG AND DROP REORDERING
    // ========================

    function initDragAndDrop() {
        let draggedItem = null;

        $(document).on('dragstart', '.tab-editor-item', function(e) {
            draggedItem = this;
            $(this).addClass('dragging');
            e.originalEvent.dataTransfer.effectAllowed = 'move';
        });

        $(document).on('dragend', '.tab-editor-item', function() {
            $(this).removeClass('dragging');
            draggedItem = null;
            renumberTabs();
            updatePreview();
        });

        $(document).on('dragover', '.tab-editor-item', function(e) {
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = 'move';

            const bounding = this.getBoundingClientRect();
            const offset = e.originalEvent.clientY - bounding.top;

            if (offset > bounding.height / 2) {
                $(this).after(draggedItem);
            } else {
                $(this).before(draggedItem);
            }
        });

        $(document).on('dragover', '#tabs-container', function(e) {
            e.preventDefault();
        });
    }

    // ========================
    // SIDEBAR REFRESH
    // ========================

    function refreshSidebar(activeId) {
        // Instead of full page reload, just update or add the item
        const name = $('#tab-set-name').val();
        const shortcode = '[custom_tabs id="' + activeId + '"]';
        const existing = $('.tab-set-item[data-id="' + activeId + '"]');

        if (existing.length) {
            existing.find('strong').text(name);
            existing.find('.shortcode-display').text(shortcode);
        } else {
            // Remove "no tab sets" message
            $('.no-tab-sets').remove();

            const newItem = `
                <li class="tab-set-item active" data-id="${escapeAttr(activeId)}">
                    <div class="tab-set-item-info">
                        <strong>${escapeHtml(name)}</strong>
                        <code class="shortcode-display">${shortcode}</code>
                    </div>
                    <div class="tab-set-item-actions">
                        <button type="button" class="button button-small edit-tab-set" data-id="${escapeAttr(activeId)}">Edit</button>
                        <button type="button" class="button button-small button-link-delete delete-tab-set" data-id="${escapeAttr(activeId)}">Delete</button>
                    </div>
                </li>
            `;
            $('#tab-sets-list').append(newItem);
        }

        $('.tab-set-item').removeClass('active');
        $('.tab-set-item[data-id="' + activeId + '"]').addClass('active');
    }

    // ========================
    // UI HELPERS
    // ========================

    function showEditor() {
        $('#placeholder-panel').hide();
        $('#editor-panel').show();
    }

    function cancelEdit() {
        currentEditId = '';
        $('#editor-panel').hide();
        $('#placeholder-panel').show();
        $('.tab-set-item').removeClass('active');
    }

    function copyShortcode() {
        const input = document.getElementById('shortcode-output');
        input.select();
        input.setSelectionRange(0, 99999);

        navigator.clipboard.writeText(input.value).then(function() {
            const btn = $('#copy-shortcode');
            btn.text('Copied!');
            setTimeout(function() {
                btn.text('Copy');
            }, 2000);
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    function escapeAttr(text) {
        return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

})(jQuery);
