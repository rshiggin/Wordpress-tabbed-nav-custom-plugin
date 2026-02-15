?php
// admin/admin-page.php
if (!defined('ABSPATH')) exit;
?>
<div class="wrap custom-tabs-admin-wrap">
    <h1><?php _e('Custom Tabs Editor', 'custom-tabs-shortcode'); ?></h1>
    <p class="description"><?php _e('Create and manage tabbed content. Use the shortcode <code>[custom_tabs id="your-tab-set-id"]</code> to display tabs on any page or post.', 'custom-tabs-shortcode'); ?></p>

    <div class="custom-tabs-admin-layout">

        <!-- LEFT SIDEBAR: Tab Set List -->
        <div class="custom-tabs-sidebar">
            <h2><?php _e('Tab Sets', 'custom-tabs-shortcode'); ?></h2>
            <ul id="tab-sets-list">
                <?php if (!empty($all_tab_sets)) : ?>
                    <?php foreach ($all_tab_sets as $id => $set) : ?>
                        <li class="tab-set-item" data-id="<?php echo esc_attr($id); ?>">
                            <div class="tab-set-item-info">
                                <strong><?php echo esc_html($set['name']); ?></strong>
                                <code class="shortcode-display">[custom_tabs id="<?php echo esc_attr($id); ?>"]</code>
                            </div>
                            <div class="tab-set-item-actions">
                                <button type="button" class="button button-small edit-tab-set" data-id="<?php echo esc_attr($id); ?>">
                                    <?php _e('Edit', 'custom-tabs-shortcode'); ?>
                                </button>
                                <button type="button" class="button button-small button-link-delete delete-tab-set" data-id="<?php echo esc_attr($id); ?>">
                                    <?php _e('Delete', 'custom-tabs-shortcode'); ?>
                                </button>
                            </div>
                        </li>
                    <?php endforeach; ?>
                <?php else : ?>
                    <li class="no-tab-sets"><?php _e('No tab sets yet. Create one!', 'custom-tabs-shortcode'); ?></li>
                <?php endif; ?>
            </ul>
            <button type="button" id="create-new-tab-set" class="button button-primary" style="margin-top:12px;">
                <?php _e('+ Create New Tab Set', 'custom-tabs-shortcode'); ?>
            </button>
        </div>

        <!-- RIGHT MAIN: Editor Panel -->
        <div class="custom-tabs-editor-panel" id="editor-panel" style="display:none;">
            <form id="tab-set-form">
                <input type="hidden" id="editing-tab-set-id" value="">

                <div class="editor-header">
                    <h2 id="editor-title"><?php _e('New Tab Set', 'custom-tabs-shortcode'); ?></h2>
                    <div id="shortcode-copy-area" style="display:none;">
                        <label><?php _e('Shortcode:', 'custom-tabs-shortcode'); ?></label>
                        <input type="text" id="shortcode-output" readonly class="shortcode-input">
                        <button type="button" id="copy-shortcode" class="button button-small"><?php _e('Copy', 'custom-tabs-shortcode'); ?></button>
                    </div>
                </div>

                <table class="form-table">
                    <tr>
                        <th><label for="tab-set-name"><?php _e('Tab Set Name', 'custom-tabs-shortcode'); ?></label></th>
                        <td><input type="text" id="tab-set-name" class="regular-text" placeholder="e.g. Product Features" required></td>
                    </tr>
                </table>

                <h3><?php _e('Tabs', 'custom-tabs-shortcode'); ?></h3>
                <p class="description"><?php _e('Add, remove, and reorder tabs. Drag to reorder.', 'custom-tabs-shortcode'); ?></p>

                <div id="tabs-container">
                    <!-- Dynamic tab items added here -->
                </div>

                <button type="button" id="add-tab-btn" class="button">
                    <?php _e('+ Add Tab', 'custom-tabs-shortcode'); ?>
                </button>

                <div class="editor-footer">
                    <button type="submit" id="save-tab-set" class="button button-primary button-large">
                        <?php _e('Save Tab Set', 'custom-tabs-shortcode'); ?>
                    </button>
                    <button type="button" id="cancel-edit" class="button button-large">
                        <?php _e('Cancel', 'custom-tabs-shortcode'); ?>
                    </button>
                    <span id="save-status" class="save-status"></span>
                </div>
            </form>

            <!-- Live Preview -->
            <div class="live-preview-section">
                <h3><?php _e('Live Preview', 'custom-tabs-shortcode'); ?></h3>
                <div id="live-preview" class="live-preview-container">
                    <p class="description"><?php _e('Preview will appear here as you edit.', 'custom-tabs-shortcode'); ?></p>
                </div>
            </div>
        </div>

        <!-- Placeholder when nothing is selected -->
        <div class="custom-tabs-placeholder" id="placeholder-panel">
            <div class="placeholder-content">
                <span class="dashicons dashicons-table-row-after" style="font-size:48px;width:48px;height:48px;color:#ccc;"></span>
                <h3><?php _e('Select a tab set to edit or create a new one', 'custom-tabs-shortcode'); ?></h3>
            </div>
        </div>

    </div>
</div>
