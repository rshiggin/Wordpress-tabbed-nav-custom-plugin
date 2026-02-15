<?php
/**
 * Admin page template – admin/admin-page.php
 *
 * Variables available from the calling method:
 *   $all_tab_sets  (array)  All saved tab-set data keyed by ID.
 *
 * @package Custom_Tabs_Shortcode
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( ! current_user_can( 'manage_options' ) ) {
    wp_die( esc_html__( 'Unauthorized access.', 'custom-tabs-shortcode' ) );
}
?>

<div class="wrap cts-wrap">

    <h1><?php esc_html_e( 'Custom Tabs Editor', 'custom-tabs-shortcode' ); ?></h1>

    <p class="description">
        <?php
        printf(
            /* translators: %s: example shortcode */
            esc_html__( 'Create and manage tabbed content. Embed with the shortcode %s on any page or post.', 'custom-tabs-shortcode' ),
            '<code>[custom_tabs id="your-id"]</code>'
        );
        ?>
    </p>

    <div class="cts-layout">

        <!-- ============================================
             LEFT SIDEBAR – Tab-set list
             ============================================ -->
        <div class="cts-sidebar" id="cts-sidebar">

            <h2><?php esc_html_e( 'Tab Sets', 'custom-tabs-shortcode' ); ?></h2>

            <ul id="cts-tab-sets-list" class="cts-tab-sets-list">
                <?php if ( ! empty( $all_tab_sets ) ) : ?>
                    <?php foreach ( $all_tab_sets as $id => $set ) : ?>
                        <li class="cts-set-item" data-id="<?php echo esc_attr( $id ); ?>">
                            <div class="cts-set-item__info">
                                <strong class="cts-set-item__name">
                                    <?php echo esc_html( $set['name'] ); ?>
                                </strong>
                                <code class="cts-set-item__shortcode">
                                    [custom_tabs id="<?php echo esc_attr( $id ); ?>"]
                                </code>
                                <span class="cts-set-item__count">
                                    <?php
                                    $count = isset( $set['tabs'] ) ? count( $set['tabs'] ) : 0;
                                    printf(
                                        esc_html( _n( '%d tab', '%d tabs', $count, 'custom-tabs-shortcode' ) ),
                                        $count
                                    );
                                    ?>
                                </span>
                            </div>
                            <div class="cts-set-item__actions">
                                <button type="button"
                                        class="button button-small cts-btn-edit"
                                        data-id="<?php echo esc_attr( $id ); ?>">
                                    <?php esc_html_e( 'Edit', 'custom-tabs-shortcode' ); ?>
                                </button>
                                <button type="button"
                                        class="button button-small button-link-delete cts-btn-delete"
                                        data-id="<?php echo esc_attr( $id ); ?>">
                                    <?php esc_html_e( 'Delete', 'custom-tabs-shortcode' ); ?>
                                </button>
                            </div>
                        </li>
                    <?php endforeach; ?>
                <?php else : ?>
                    <li class="cts-set-item--empty">
                        <?php esc_html_e( 'No tab sets yet. Create one!', 'custom-tabs-shortcode' ); ?>
                    </li>
                <?php endif; ?>
            </ul>

            <button type="button" id="cts-create-new" class="button button-primary" style="margin-top:12px;width:100%;">
                <?php esc_html_e( '+ Create New Tab Set', 'custom-tabs-shortcode' ); ?>
            </button>

        </div><!-- .cts-sidebar -->

        <!-- ============================================
             MAIN – Editor panel (hidden until selection)
             ============================================ -->
        <div class="cts-editor" id="cts-editor" style="display:none;">

            <form id="cts-form" method="post" novalidate>

                <!-- Hidden field: current tab-set ID (blank for new) -->
                <input type="hidden" id="cts-editing-id" name="cts_editing_id" value="">

                <!-- Header row -->
                <div class="cts-editor__header">
                    <h2 id="cts-editor-title">
                        <?php esc_html_e( 'New Tab Set', 'custom-tabs-shortcode' ); ?>
                    </h2>
                    <div id="cts-shortcode-area" class="cts-shortcode-area" style="display:none;">
                        <label for="cts-shortcode-output">
                            <?php esc_html_e( 'Shortcode:', 'custom-tabs-shortcode' ); ?>
                        </label>
                        <input type="text"
                               id="cts-shortcode-output"
                               class="cts-shortcode-input"
                               readonly
                               value="">
                        <button type="button" id="cts-copy-shortcode" class="button button-small">
                            <?php esc_html_e( 'Copy', 'custom-tabs-shortcode' ); ?>
                        </button>
                    </div>
                </div>

                <!-- Tab-set name -->
                <table class="form-table" role="presentation">
                    <tbody>
                        <tr>
                            <th scope="row">
                                <label for="cts-name">
                                    <?php esc_html_e( 'Tab Set Name', 'custom-tabs-shortcode' ); ?>
                                </label>
                            </th>
                            <td>
                                <input type="text"
                                       id="cts-name"
                                       name="cts_name"
                                       class="regular-text"
                                       placeholder="<?php esc_attr_e( 'e.g. Product Features', 'custom-tabs-shortcode' ); ?>"
                                       required>
                                <p class="description">
                                    <?php esc_html_e( 'An internal label; it also becomes the ARIA label for the tab list.', 'custom-tabs-shortcode' ); ?>
                                </p>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Individual tabs -->
                <h3><?php esc_html_e( 'Tabs', 'custom-tabs-shortcode' ); ?></h3>
                <p class="description">
                    <?php esc_html_e( 'Add, edit, and remove tabs. Drag the handle (≡) to reorder. HTML is allowed in content.', 'custom-tabs-shortcode' ); ?>
                </p>

                <div id="cts-tabs-container" class="cts-tabs-container">
                    <!-- JS will inject .cts-tab-item elements here -->
                </div>

                <button type="button" id="cts-add-tab" class="button">
                    <?php esc_html_e( '+ Add Tab', 'custom-tabs-shortcode' ); ?>
                </button>

                <!-- Save / Cancel -->
                <div class="cts-editor__footer">
                    <button type="submit" id="cts-save" class="button button-primary button-large">
                        <?php esc_html_e( 'Save Tab Set', 'custom-tabs-shortcode' ); ?>
                    </button>
                    <button type="button" id="cts-cancel" class="button button-large">
                        <?php esc_html_e( 'Cancel', 'custom-tabs-shortcode' ); ?>
                    </button>
                    <span id="cts-save-status" class="cts-save-status" aria-live="polite"></span>
                </div>

            </form>

            <!-- Live preview -->
            <div class="cts-preview-section">
                <h3><?php esc_html_e( 'Live Preview', 'custom-tabs-shortcode' ); ?></h3>
                <div id="cts-preview" class="cts-preview-box">
                    <p class="description">
                        <?php esc_html_e( 'A preview will appear here as you edit.', 'custom-tabs-shortcode' ); ?>
                    </p>
                </div>
            </div>

        </div><!-- .cts-editor -->

        <!-- ============================================
             PLACEHOLDER – Shown when nothing is selected
             ============================================ -->
        <div class="cts-placeholder" id="cts-placeholder">
            <div class="cts-placeholder__inner">
                <span class="dashicons dashicons-table-row-after"></span>
                <h3><?php esc_html_e( 'Select a tab set to edit, or create a new one.', 'custom-tabs-shortcode' ); ?></h3>
            </div>
        </div>

    </div><!-- .cts-layout -->

</div><!-- .wrap -->
