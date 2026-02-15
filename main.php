<?php
/**
 * Plugin Name: Custom Tabs Shortcode
 * Description: Create accessible, customizable tabbed content using shortcodes with an admin editor.
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL license v3 or later
 * Text Domain: custom-tabs-shortcode
 */

if (!defined('ABSPATH')) {
    exit;
}

class Custom_Tabs_Shortcode_Plugin {

    private static $instance = null;
    private $option_name = 'custom_tabs_data';

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Register hooks
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_frontend_assets']);
        add_action('wp_ajax_save_tab_set', [$this, 'ajax_save_tab_set']);
        add_action('wp_ajax_delete_tab_set', [$this, 'ajax_delete_tab_set']);
        add_action('wp_ajax_get_tab_set', [$this, 'ajax_get_tab_set']);

        // Register shortcodes
        add_shortcode('custom_tabs', [$this, 'render_tabs_shortcode']);

        // Activation hook
        register_activation_hook(__FILE__, [$this, 'activate']);
    }

    /**
     * Plugin activation - set default options
     */
    public function activate() {
        if (!get_option($this->option_name)) {
            // Create a sample tab set
            $default_data = [
                'tab-set-1' => [
                    'id'   => 'tab-set-1',
                    'name' => 'Sample Tab Set',
                    'tabs' => [
                        [
                            'title'   => 'Tab One',
                            'content' => '<p>Sed ut perspiciatis, unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam eaque ipsa, quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt, explicabo.</p>',
                        ],
                        [
                            'title'   => 'Tab Two',
                            'content' => '<p>At vero eos et accusamus et iusto odio dignissimos ducimus, qui blanditiis praesentium voluptatum deleniti atque corrupti, quos dolores et quas molestias.</p>',
                        ],
                        [
                            'title'   => 'Tab Three',
                            'content' => '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>',
                        ],
                    ],
                ],
            ];
            update_option($this->option_name, $default_data);
        }
    }

    /**
     * Add admin menu page
     */
    public function add_admin_menu() {
        add_menu_page(
            __('Custom Tabs', 'custom-tabs-shortcode'),
            __('Custom Tabs', 'custom-tabs-shortcode'),
            'manage_options',
            'custom-tabs-editor',
            [$this, 'render_admin_page'],
            'dashicons-table-row-after',
            30
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('custom_tabs_settings', $this->option_name);
    }

    /**
     * Enqueue admin CSS and JS
     */
    public function enqueue_admin_assets($hook) {
        if ($hook !== 'toplevel_page_custom-tabs-editor') {
            return;
        }

        wp_enqueue_editor();
        wp_enqueue_style(
            'custom-tabs-admin-css',
            plugin_dir_url(__FILE__) . 'admin/admin-assets.css',
            [],
            '1.0.0'
        );
        wp_enqueue_script(
            'custom-tabs-admin-js',
            plugin_dir_url(__FILE__) . 'admin/admin-script.js',
            ['jquery', 'wp-editor'],
            '1.0.0',
            true
        );
        wp_localize_script('custom-tabs-admin-js', 'customTabsAdmin', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('custom_tabs_nonce'),
        ]);
    }

    /**
     * Enqueue frontend CSS and JS
     */
    public function enqueue_frontend_assets() {
        wp_enqueue_style(
            'custom-tabs-frontend-css',
            plugin_dir_url(__FILE__) . 'assets/tabs-style.css',
            [],
            '1.0.0'
        );
        wp_enqueue_script(
            'custom-tabs-frontend-js',
            plugin_dir_url(__FILE__) . 'assets/tabs-script.js',
            [],
            '1.0.0',
            true
        );
    }

    /**
     * Get all tab sets
     */
    private function get_all_tab_sets() {
        $data = get_option($this->option_name, []);
        return is_array($data) ? $data : [];
    }

    /**
     * Get a single tab set by ID
     */
    private function get_tab_set($id) {
        $all = $this->get_all_tab_sets();
        return isset($all[$id]) ? $all[$id] : null;
    }

    /**
     * Save a tab set
     */
    private function save_tab_set($id, $data) {
        $all = $this->get_all_tab_sets();
        $all[$id] = $data;
        update_option($this->option_name, $all);
    }

    /**
     * Delete a tab set
     */
    private function delete_tab_set_data($id) {
        $all = $this->get_all_tab_sets();
        if (isset($all[$id])) {
            unset($all[$id]);
            update_option($this->option_name, $all);
            return true;
        }
        return false;
    }

    /**
     * AJAX: Save tab set
     */
    public function ajax_save_tab_set() {
        check_ajax_referer('custom_tabs_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }

        $tab_set_id   = sanitize_text_field($_POST['tab_set_id'] ?? '');
        $tab_set_name = sanitize_text_field($_POST['tab_set_name'] ?? '');
        $tabs_raw     = $_POST['tabs'] ?? [];

        if (empty($tab_set_id)) {
            $tab_set_id = 'tab-set-' . sanitize_title($tab_set_name) . '-' . time();
        }

        $tabs = [];
        if (is_array($tabs_raw)) {
            foreach ($tabs_raw as $tab) {
                $tabs[] = [
                    'title'   => sanitize_text_field($tab['title'] ?? ''),
                    'content' => wp_kses_post($tab['content'] ?? ''),
                ];
            }
        }

        $data = [
            'id'   => $tab_set_id,
            'name' => $tab_set_name,
            'tabs' => $tabs,
        ];

        $this->save_tab_set($tab_set_id, $data);

        wp_send_json_success([
            'message' => 'Tab set saved successfully.',
            'id'      => $tab_set_id,
            'data'    => $data,
        ]);
    }

    /**
     * AJAX: Delete tab set
     */
    public function ajax_delete_tab_set() {
        check_ajax_referer('custom_tabs_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }

        $tab_set_id = sanitize_text_field($_POST['tab_set_id'] ?? '');

        if ($this->delete_tab_set_data($tab_set_id)) {
            wp_send_json_success(['message' => 'Tab set deleted.']);
        } else {
            wp_send_json_error('Tab set not found.');
        }
    }

    /**
     * AJAX: Get tab set data
     */
    public function ajax_get_tab_set() {
        check_ajax_referer('custom_tabs_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }

        $tab_set_id = sanitize_text_field($_POST['tab_set_id'] ?? '');
        $data = $this->get_tab_set($tab_set_id);

        if ($data) {
            wp_send_json_success($data);
        } else {
            wp_send_json_error('Tab set not found.');
        }
    }

    /**
     * Render the admin editor page
     */
    public function render_admin_page() {
        $all_tab_sets = $this->get_all_tab_sets();
        include plugin_dir_path(__FILE__) . 'admin/admin-page.php';
    }

    /**
     * Render tabs shortcode on the frontend
     * Usage: [custom_tabs id="tab-set-1"]
     */
    public function render_tabs_shortcode($atts) {
        $atts = shortcode_atts([
            'id' => '',
        ], $atts, 'custom_tabs');

        if (empty($atts['id'])) {
            return '<!-- Custom Tabs: No ID specified -->';
        }

        $tab_set = $this->get_tab_set($atts['id']);

        if (!$tab_set || empty($tab_set['tabs'])) {
            return '<!-- Custom Tabs: Tab set not found -->';
        }

        $unique_id = 'tabs-' . esc_attr($atts['id']);
        $tabs = $tab_set['tabs'];

        ob_start();
        ?>
        <div class="tabs" data-tabs="<?php echo esc_attr($unique_id); ?>">
            <div class="tabs__tablist" aria-label="<?php echo esc_attr($tab_set['name']); ?>" data-tab-list>
                <?php foreach ($tabs as $index => $tab) : ?>
                    <button class="tabs__tab" data-tab<?php echo $index === 0 ? ' data-tab-init' : ''; ?>>
                        <?php echo esc_html($tab['title']); ?>
                    </button>
                <?php endforeach; ?>
            </div>
            <?php foreach ($tabs as $index => $tab) : ?>
                <div class="tabs__panel" data-tab-panel>
                    <?php echo wp_kses_post($tab['content']); ?>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }
}

// Initialize the plugin
Custom_Tabs_Shortcode_Plugin::get_instance();
