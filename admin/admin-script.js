/**
 * admin/admin-script.js
 *
 * Custom Tabs Shortcode – Admin editor logic.
 * Handles CRUD, live preview, drag-and-drop reordering.
 *
 * Depends: jQuery (bundled with WP).
 * Receives: ctsAdmin.ajaxUrl, ctsAdmin.nonce  (via wp_localize_script).
 */

( function ( $ ) {
    'use strict';

    /* -------------------------------------------------
     *  State
     * ----------------------------------------------- */

    var currentId  = '';   // ID of the tab set being edited ('' = new)
    var tabCounter = 0;    // Monotonic counter for DOM keys

    /* -------------------------------------------------
     *  Boot
     * ----------------------------------------------- */

    $( document ).ready( function () {
        bindSidebarEvents();
        bindEditorEvents();
        bindDragAndDrop();
    } );

    /* =================================================
     *  EVENT BINDING
     * =============================================== */

    function bindSidebarEvents() {
        $( '#cts-create-new' ).on( 'click', createNew );

        $( document ).on( 'click', '.cts-btn-edit', function () {
            loadSet( $( this ).data( 'id' ) );
        } );

        $( document ).on( 'click', '.cts-btn-delete', function () {
            deleteSet( $( this ).data( 'id' ) );
        } );
    }

    function bindEditorEvents() {
        $( '#cts-add-tab' ).on( 'click', function () {
            addTab( 'New Tab', '<p>Enter content here.</p>' );
            refreshPreview();
            scrollToBottom();
        } );

        $( document ).on( 'click', '.cts-tab-item__remove', removeTab );
        $( document ).on( 'click', '.cts-tab-item__toggle', toggleBody );

        $( '#cts-form' ).on( 'submit', saveSet );
        $( '#cts-cancel' ).on( 'click', cancelEdit );
        $( '#cts-copy-shortcode' ).on( 'click', copyShortcode );

        // Live preview on typing
        $( document ).on( 'input', '.cts-input-title, .cts-textarea-content', refreshPreview );
    }

    /* =================================================
     *  DRAG AND DROP
     * =============================================== */

    function bindDragAndDrop() {
        var dragged = null;

        $( document ).on( 'dragstart', '.cts-tab-item', function ( e ) {
            dragged = this;
            $( this ).addClass( 'cts-tab-item--dragging' );
            e.originalEvent.dataTransfer.effectAllowed = 'move';
            // Firefox requires setData to fire drag events
            e.originalEvent.dataTransfer.setData( 'text/plain', '' );
        } );

        $( document ).on( 'dragend', '.cts-tab-item', function () {
            $( this ).removeClass( 'cts-tab-item--dragging' );
            dragged = null;
            renumber();
            refreshPreview();
        } );

        $( document ).on( 'dragover', '.cts-tab-item', function ( e ) {
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = 'move';

            if ( this === dragged ) {
                return;
            }

            var rect   = this.getBoundingClientRect();
            var midY   = rect.top + rect.height / 2;

            if ( e.originalEvent.clientY < midY ) {
                $( this ).before( dragged );
            } else {
                $( this ).after( dragged );
            }
        } );

        $( document ).on( 'drop', '.cts-tab-item', function ( e ) {
            e.preventDefault();
            e.stopPropagation();
        } );

        // Allow dropping on the container itself (e.g. at the end of list)
        $( document ).on( 'dragover', '#cts-tabs-container', function ( e ) {
            e.preventDefault();
        } );

        $( document ).on( 'drop', '#cts-tabs-container', function ( e ) {
            e.preventDefault();
        } );
    }

    /* =================================================
     *  CREATE / LOAD / SAVE / DELETE
     * =============================================== */

    /** Reset editor for a brand-new tab set. */
    function createNew() {
        currentId = '';
        $( '#cts-editing-id' ).val( '' );
        $( '#cts-name' ).val( '' );
        $( '#cts-editor-title' ).text( 'New Tab Set' );
        $( '#cts-shortcode-area' ).hide();
        $( '#cts-tabs-container' ).empty();
        tabCounter = 0;

        addTab( 'Tab One',   '<p>Enter content for tab one here.</p>' );
        addTab( 'Tab Two',   '<p>Enter content for tab two here.</p>' );

        showEditor();
        refreshPreview();
    }

    /** Fetch an existing set via AJAX and populate the editor. */
    function loadSet( id ) {
        $.post( ctsAdmin.ajaxUrl, {
            action:     'cts_get_tab_set',
            nonce:      ctsAdmin.nonce,
            tab_set_id: id,
        }, function ( res ) {
            if ( ! res.success ) {
                alert( res.data && res.data.message ? res.data.message : 'Could not load tab set.' );
                return;
            }

            var data = res.data;

            currentId = data.id;
            $( '#cts-editing-id' ).val( data.id );
            $( '#cts-name' ).val( data.name );
            $( '#cts-editor-title' ).text( 'Edit: ' + data.name );

            $( '#cts-shortcode-output' ).val( '[custom_tabs id="' + data.id + '"]' );
            $( '#cts-shortcode-area' ).show();

            $( '#cts-tabs-container' ).empty();
            tabCounter = 0;

            $.each( data.tabs, function ( _i, tab ) {
                addTab( tab.title, tab.content );
            } );

            highlightSidebar( data.id );
            showEditor();
            refreshPreview();
        } );
    }

    /** Persist the current editor state via AJAX. */
    function saveSet( e ) {
        e.preventDefault();

        var name = $.trim( $( '#cts-name' ).val() );
        if ( ! name ) {
            alert( 'Please enter a tab set name.' );
            $( '#cts-name' ).focus();
            return;
        }

        var tabs = collectTabs();
        if ( tabs.length === 0 ) {
            alert( 'Please add at least one tab with a title.' );
            return;
        }

        // Build POST data with indexed keys so PHP receives a proper array
        var postData = {
            action:       'cts_save_tab_set',
            nonce:        ctsAdmin.nonce,
            tab_set_id:   currentId,
            tab_set_name: name,
        };

        $.each( tabs, function ( i, tab ) {
            postData[ 'tabs[' + i + '][title]' ]   = tab.title;
            postData[ 'tabs[' + i + '][content]' ] = tab.content;
        } );

        $( '#cts-save' ).prop( 'disabled', true ).text( 'Saving…' );

        $.post( ctsAdmin.ajaxUrl, postData, function ( res ) {
            $( '#cts-save' ).prop( 'disabled', false ).text( 'Save Tab Set' );

            if ( ! res.success ) {
                alert( res.data && res.data.message ? res.data.message : 'Error saving.' );
                return;
            }

            currentId = res.data.id;
            $( '#cts-editing-id' ).val( currentId );
            $( '#cts-editor-title' ).text( 'Edit: ' + name );

            $( '#cts-shortcode-output' ).val( '[custom_tabs id="' + currentId + '"]' );
            $( '#cts-shortcode-area' ).show();

            flashStatus( '✓ Saved!' );
            refreshSidebarItem( currentId, name, tabs.length );
        } );
    }

    /** Delete a tab set after confirmation. */
    function deleteSet( id ) {
        if ( ! confirm( 'Delete this tab set permanently? This cannot be undone.' ) ) {
            return;
        }

        $.post( ctsAdmin.ajaxUrl, {
            action:     'cts_delete_tab_set',
            nonce:      ctsAdmin.nonce,
            tab_set_id: id,
        }, function ( res ) {
            if ( ! res.success ) {
                alert( res.data && res.data.message ? res.data.message : 'Could not delete.' );
                return;
            }

            $( '.cts-set-item[data-id="' + id + '"]' ).fadeOut( 250, function () {
                $( this ).remove();
                if ( $( '#cts-tab-sets-list .cts-set-item' ).length === 0 ) {
                    $( '#cts-tab-sets-list' ).html(
                        '<li class="cts-set-item--empty">No tab sets yet. Create one!</li>'
                    );
                }
            } );

            // If the deleted set was open in the editor, close it
            if ( currentId === id ) {
                cancelEdit();
            }
        } );
    }

    /* =================================================
     *  TAB MANAGEMENT (add / remove / toggle / reorder)
     * =============================================== */

    /**
     * Append a new tab editor item.
     *
     * @param {string} title
     * @param {string} content
     */
    function addTab( title, content ) {
        tabCounter++;

        var index = $( '#cts-tabs-container .cts-tab-item' ).length + 1;

        var html =
            '<div class="cts-tab-item" draggable="true">' +
                '<div class="cts-tab-item__header">' +
                    '<span class="cts-tab-item__drag dashicons dashicons-menu"></span>' +
                    '<span class="cts-tab-item__number">Tab ' + index + '</span>' +
                    '<span class="cts-tab-item__title-preview">' + esc( title ) + '</span>' +
                    '<button type="button" class="cts-tab-item__toggle dashicons dashicons-arrow-down-alt2" title="Toggle"></button>' +
                    '<button type="button" class="cts-tab-item__remove dashicons dashicons-trash" title="Remove"></button>' +
                '</div>' +
                '<div class="cts-tab-item__body">' +
                    '<label>Tab Title</label>' +
                    '<input type="text" class="cts-input-title" value="' + escAttr( title ) + '" placeholder="Enter tab title">' +
                    '<label>Tab Content <small>(HTML allowed)</small></label>' +
                    '<textarea class="cts-textarea-content" placeholder="Enter content here">' + esc( content ) + '</textarea>' +
                '</div>' +
            '</div>';

        $( '#cts-tabs-container' ).append( html );
    }

    /** Remove a tab item (minimum 1 must remain). */
    function removeTab() {
        if ( $( '#cts-tabs-container .cts-tab-item' ).length <= 1 ) {
            alert( 'You must keep at least one tab.' );
            return;
        }

        $( this ).closest( '.cts-tab-item' ).fadeOut( 200, function () {
            $( this ).remove();
            renumber();
            refreshPreview();
        } );
    }

    /** Collapse / expand the body of a tab editor item. */
    function toggleBody() {
        var $body = $( this ).closest( '.cts-tab-item' ).find( '.cts-tab-item__body' );
        $body.toggleClass( 'cts-body--hidden' );
        $( this ).toggleClass( 'cts-collapsed' );
    }

    /** Re-number the "Tab N" labels after reorder or deletion. */
    function renumber() {
        $( '#cts-tabs-container .cts-tab-item' ).each( function ( i ) {
            $( this ).find( '.cts-tab-item__number' ).text( 'Tab ' + ( i + 1 ) );
        } );
    }

    /**
     * Read current tab data from the DOM.
     *
     * @return {Array<{title:string, content:string}>}
     */
    function collectTabs() {
        var tabs = [];
        $( '#cts-tabs-container .cts-tab-item' ).each( function () {
            var t = $.trim( $( this ).find( '.cts-input-title' ).val() );
            if ( t ) {
                tabs.push( {
                    title:   t,
                    content: $( this ).find( '.cts-textarea-content' ).val(),
                } );
            }
        } );
        return tabs;
    }

    /* =================================================
     *  LIVE PREVIEW
     * =============================================== */

    function refreshPreview() {
        var tabs = collectTabs();

        // Also keep the header title-preview spans in sync
        $( '#cts-tabs-container .cts-tab-item' ).each( function () {
            var t = $( this ).find( '.cts-input-title' ).val() || 'Untitled';
            $( this ).find( '.cts-tab-item__title-preview' ).text( t );
        } );

        if ( ! tabs.length ) {
            $( '#cts-preview' ).html( '<p class="description">Add tabs to see a preview.</p>' );
            return;
        }

        var tablist = '<div class="tabs__tablist">';
        var panels  = '';

        $.each( tabs, function ( i, tab ) {
            var active  = i === 0 ? ' cts-preview-active' : '';
            var visible = i === 0 ? ' cts-preview-visible' : '';

            tablist += '<button type="button" class="tabs__tab' + active + '" data-pidx="' + i + '">' +
                           esc( tab.title ) +
                       '</button>';

            panels += '<div class="tabs__panel' + visible + '" data-ppanel="' + i + '">' +
                          tab.content +
                      '</div>';
        } );

        tablist += '</div>';

        $( '#cts-preview' ).html( '<div class="tabs">' + tablist + panels + '</div>' );

        // Bind click within preview
        $( '#cts-preview' ).find( '[data-pidx]' ).on( 'click', function () {
            var idx = $( this ).data( 'pidx' );
            $( '#cts-preview .tabs__tab' ).removeClass( 'cts-preview-active' );
            $( '#cts-preview .tabs__panel' ).removeClass( 'cts-preview-visible' );
            $( this ).addClass( 'cts-preview-active' );
            $( '#cts-preview [data-ppanel="' + idx + '"]' ).addClass( 'cts-preview-visible' );
        } );
    }

    /* =================================================
     *  SIDEBAR HELPERS
     * =============================================== */

    function highlightSidebar( id ) {
        $( '.cts-set-item' ).removeClass( 'cts-set-item--active' );
        $( '.cts-set-item[data-id="' + id + '"]' ).addClass( 'cts-set-item--active' );
    }

    /**
     * Update or insert the sidebar entry for a just-saved tab set.
     */
    function refreshSidebarItem( id, name, tabCount ) {
        var $existing = $( '.cts-set-item[data-id="' + id + '"]' );
        var shortcode = '[custom_tabs id="' + id + '"]';
        var countLabel = tabCount === 1 ? '1 tab' : tabCount + ' tabs';

        if ( $existing.length ) {
            $existing.find( '.cts-set-item__name' ).text( name );
            $existing.find( '.cts-set-item__shortcode' ).text( shortcode );
            $existing.find( '.cts-set-item__count' ).text( countLabel );
        } else {
            // Remove "no sets" placeholder
            $( '.cts-set-item--empty' ).remove();

            var li =
                '<li class="cts-set-item" data-id="' + escAttr( id ) + '">' +
                    '<div class="cts-set-item__info">' +
                        '<strong class="cts-set-item__name">' + esc( name ) + '</strong>' +
                        '<code class="cts-set-item__shortcode">' + shortcode + '</code>' +
                        '<span class="cts-set-item__count">' + countLabel + '</span>' +
                    '</div>' +
                    '<div class="cts-set-item__actions">' +
                        '<button type="button" class="button button-small cts-btn-edit" data-id="' + escAttr( id ) + '">Edit</button>' +
                        '<button type="button" class="button button-small button-link-delete cts-btn-delete" data-id="' + escAttr( id ) + '">Delete</button>' +
                    '</div>' +
                '</li>';

            $( '#cts-tab-sets-list' ).append( li );
        }

        highlightSidebar( id );
    }

    /* =================================================
     *  UI HELPERS
     * =============================================== */

    function showEditor() {
        $( '#cts-placeholder' ).hide();
        $( '#cts-editor' ).show();
        $( '#cts-name' ).focus();
    }

    function cancelEdit() {
        currentId = '';
        $( '#cts-editor' ).hide();
        $( '#cts-placeholder' ).show();
        $( '.cts-set-item' ).removeClass( 'cts-set-item--active' );
    }

    function copyShortcode() {
        var el = document.getElementById( 'cts-shortcode-output' );
        el.select();
        el.setSelectionRange( 0, 99999 );

        if ( navigator.clipboard && navigator.clipboard.writeText ) {
            navigator.clipboard.writeText( el.value ).then( function () {
                flashCopyButton();
            } );
        } else {
            // Fallback for older browsers
            document.execCommand( 'copy' );
            flashCopyButton();
        }
    }

    function flashCopyButton() {
        var $btn = $( '#cts-copy-shortcode' );
        $btn.text( 'Copied!' );
        setTimeout( function () { $btn.text( 'Copy' ); }, 2000 );
    }

    function flashStatus( message ) {
        var $s = $( '#cts-save-status' );
        $s.text( message ).fadeIn( 100 );
        setTimeout( function () { $s.fadeOut( 400 ); }, 3000 );
    }

    function scrollToBottom() {
        var $c = $( '#cts-tabs-container' );
        if ( $c[0] ) {
            $c.animate( { scrollTop: $c[0].scrollHeight }, 250 );
        }
    }

    /* -------------------------------------------------
     *  Escaping utilities
     * ----------------------------------------------- */

    function esc( text ) {
        var d = document.createElement( 'div' );
        d.appendChild( document.createTextNode( text ) );
        return d.innerHTML;
    }

    function escAttr( text ) {
        return String( text )
            .replace( /&/g, '&amp;' )
            .replace( /"/g, '&quot;' )
            .replace( /'/g, '&#39;' )
            .replace( /</g, '&lt;' )
            .replace( />/g, '&gt;' );
    }

} )( jQuery );
