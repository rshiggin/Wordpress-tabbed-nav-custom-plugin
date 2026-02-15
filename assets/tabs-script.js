/**
 * assets/tabs-script.js
 *
 * Accessible tab widget for [custom_tabs] shortcode output.
 *
 * Features:
 *  - ARIA roles (tablist / tab / tabpanel) with aria-controls / aria-labelledby.
 *  - Keyboard navigation: ArrowLeft, ArrowRight, Home, End.
 *  - Supports multiple independent tab groups on one page.
 *  - Gracefully handles mismatched tab/panel counts.
 */

document.addEventListener( 'DOMContentLoaded', function () {

    var containers = document.querySelectorAll( '[data-tabs]' );

    for ( var c = 0; c < containers.length; c++ ) {
        initTabGroup( containers[ c ] );
    }

    /**
     * Initialise one tab group.
     *
     * @param {HTMLElement} container  The element with [data-tabs].
     */
    function initTabGroup( container ) {

        var tabs   = Array.prototype.slice.call( container.querySelectorAll( '[data-tab]' ) );
        var panels = Array.prototype.slice.call( container.querySelectorAll( '[data-tab-panel]' ) );

        // Only work with matching pairs
        var count = Math.min( tabs.length, panels.length );
        if ( count === 0 ) {
            return;
        }

        var uid = container.getAttribute( 'data-tabs' ) || 'tabgroup';

        // -- ARIA setup -------------------------------------------

        var tablist = container.querySelector( '[data-tab-list]' );
        if ( tablist ) {
            tablist.setAttribute( 'role', 'tablist' );
        }

        for ( var i = 0; i < count; i++ ) {
            var tabId   = uid + '-tab-' + i;
            var panelId = uid + '-panel-' + i;

            tabs[ i ].setAttribute( 'role', 'tab' );
            tabs[ i ].setAttribute( 'id', tabId );
            tabs[ i ].setAttribute( 'aria-controls', panelId );
            tabs[ i ].setAttribute( 'aria-selected', 'false' );
            tabs[ i ].setAttribute( 'tabindex', '-1' );

            panels[ i ].setAttribute( 'role', 'tabpanel' );
            panels[ i ].setAttribute( 'id', panelId );
            panels[ i ].setAttribute( 'aria-labelledby', tabId );
            panels[ i ].setAttribute( 'tabindex', '0' );
            panels[ i ].hidden = true;

            // Closure to capture index
            ( function ( idx ) {
                tabs[ idx ].addEventListener( 'click', function () {
                    activate( idx );
                } );

                tabs[ idx ].addEventListener( 'keydown', function ( e ) {
                    var next = null;

                    switch ( e.key ) {
                        case 'ArrowRight': next = ( idx + 1 ) % count;            break;
                        case 'ArrowLeft':  next = ( idx - 1 + count ) % count;    break;
                        case 'Home':       next = 0;                              break;
                        case 'End':        next = count - 1;                      break;
                    }

                    if ( next !== null ) {
                        e.preventDefault();
                        activate( next );
                    }
                } );
            } )( i );
        }

        // -- Activation -------------------------------------------

        /**
         * Show the tab at `index`; hide all others.
         *
         * @param {number} index
         */
        function activate( index ) {
            for ( var j = 0; j < count; j++ ) {
                var selected = ( j === index );
                tabs[ j ].setAttribute( 'aria-selected', String( selected ) );
                tabs[ j ].setAttribute( 'tabindex', selected ? '0' : '-1' );
                panels[ j ].hidden = ! selected;
            }
            tabs[ index ].focus();
        }

        // -- Initial state ----------------------------------------

        var initIndex = -1;
        for ( var k = 0; k < count; k++ ) {
            if ( tabs[ k ].hasAttribute( 'data-tab-init' ) ) {
                initIndex = k;
                break;
            }
        }
        activate( initIndex >= 0 ? initIndex : 0 );
    }

} );
