<?php
/**
 * Plugin Name: Custom Tabs Shortcode
 * Plugin URI:  https://example.com/custom-tabs-shortcode
 * Description: Create accessible, customizable tabbed content via shortcodes with a full admin editor, live preview, and drag-and-drop reordering.
 * Version:     1.0.0
 * Author:      Richard Higgins
 * Author URI:  https://github.com/rshiggin/
 * License:     GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: custom-tabs-shortcode
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Custom_Tabs_Shortcode_Plugin {

    /** @var self|null */
    private static $instance = null;

    /** Option key storing all tab-set data. */
    const OPTION_KEY = 'custom_tabs_data';

    /** Nonce action string. */
    const NONCE_ACTION = 'custom_tabs_nonce';

    /** Required capability for editing. */
    const CAPABILITY = 'manage_options';

    /* ----------------------------------------------------------
     *  Singleton
     * -------------------------------------------------------- */

    public static function get_instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Admin hooks
        add_action( 'admin_menu',            [ $this, 'add_admin_menu' ] );
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_assets' ] );

        // AJAX endpoints
        add_action( 'wp_ajax_cts_save_tab_set',   [ $this, 'ajax_save_tab_set' ] );
        add_action( 'wp_ajax_cts_delete_tab_set',  [ $this, 'ajax_delete_tab_set' ] );
        add_action( 'wp_ajax_cts_get_tab_set',     [ $this, 'ajax_get_tab_set' ] );

        // Frontend
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ] );
        add_shortcode( 'custom_tabs',     [ $this, 'render_shortcode' ] );

        // Activation
        register_activation_hook( __FILE__, [ $this, 'activate' ] );
    }

    /** Prevent cloning. */
    private function __clone() {}

    /** Prevent unserialization. */
    public function __wakeup() {
        throw new \Exception( 'Cannot unserialize singleton.' );
    }

    /* ----------------------------------------------------------
     *  Activation
     * -------------------------------------------------------- */

    public function activate(): void {
        if ( false === get_option( self::OPTION_KEY ) ) {
            $sample = [
                'tab-set-sample' => [
                    'id'   => 'tab-set-sample',
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
                            'content' => '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>',
                        ],
                    ],
                ],
            ];
            add_option( self::OPTION_KEY, $sample );
        }
    }

    /* ----------------------------------------------------------
     *  Data helpers
     * -------------------------------------------------------- */

    /**
     * Retrieve every tab set.
     *
     * @return array<string, array>
     */
    private function get_all_tab_sets(): array {
        $data = get_option( self::OPTION_KEY, [] );
        return is_array( $data ) ? $data : [];
    }

    /**
     * Retrieve one tab set by ID.
     *
     * @param  string $id
     * @return array|null
     */
    private function get_tab_set( string $id ): ?array {
        $all = $this->get_all_tab_sets();
        return $all[ $id ] ?? null;
    }

    /**
     * Persist a single tab set (insert or update).
     *
     * @param string $id
     * @param array  $data
     */
    private function save_tab_set( string $id, array $data ): void {
        $all         = $this->get_all_tab_sets();
        $all[ $id ]  = $data;
        update_option( self::OPTION_KEY, $all );
    }

    /**
     * Remove a tab set.
     *
     * @param  string $id
     * @return bool   True if it existed and was removed.
     */
    private function delete_tab_set( string $id ): bool {
        $all = $this->get_all_tab_sets();
        if ( ! isset( $all[ $id ] ) ) {
            return false;
        }
        unset( $all[ $id ] );
        update_option( self::OPTION_KEY, $all );
        return true;
    }

    /**
     * Generate a collision-safe tab-set ID from a human name.
     *
     * @param  string $name
     * @return string
     */
    private function generate_id( string $name ): string {
        $slug = sanitize_title( $name );
        $slug = $slug ?: 'tabset';
        return 'tab-set-' . $slug . '-' . substr( uniqid( '', true ), -8 );
    }

    /* ----------------------------------------------------------
     *  Admin menu & page
     * -------------------------------------------------------- */

    public function add_admin_menu(): void {
        add_menu_page(
            __( 'Custom Tabs', 'custom-tabs-shortcode' ),
            __( 'Custom Tabs', 'custom-tabs-shortcode' ),
            self::CAPABILITY,
            'custom-tabs-editor',
            [ $this, 'render_admin_page' ],
            'dashicons-table-row-after',
            30
        );
    }

    public function render_admin_page(): void {
        if ( ! current_user_can( self::CAPABILITY ) ) {
            wp_die( __( 'You do not have permission to access this page.', 'custom-tabs-shortcode' ) );
        }
        $all_tab_sets = $this->get_all_tab_sets();
        include plugin_dir_path( __FILE__ ) . 'admin/admin-page.php';
    }

    /* ----------------------------------------------------------
     *  Asset enqueueing
     * -------------------------------------------------------- */

    public function enqueue_admin_assets( string $hook ): void {
        if ( 'toplevel_page_custom-tabs-editor' !== $hook ) {
            return;
        }

        wp_enqueue_style(
            'cts-admin-css',
            plugin_dir_url( __FILE__ ) . 'admin/admin-assets.css',
            [],
            '1.0.0'
        );

        wp_enqueue_script(
            'cts-admin-js',
            plugin_dir_url( __FILE__ ) . 'admin/admin-script.js',
            [ 'jquery' ],
            '1.0.0',
            true
        );

        wp_localize_script( 'cts-admin-js', 'ctsAdmin', [
            'ajaxUrl' => admin_url( 'admin-ajax.php' ),
            'nonce'   => wp_create_nonce( self::NONCE_ACTION ),
        ] );
    }

    public function enqueue_frontend_assets(): void {
        wp_enqueue_style(
            'cts-frontend-css',
            plugin_dir_url( __FILE__ ) . 'assets/tabs-style.css',
            [],
            '1.0.0'
        );
        wp_enqueue_script(
            'cts-frontend-js',
            plugin_dir_url( __FILE__ ) . 'assets/tabs-script.js',
            [],
            '1.0.0',
            true
        );
    }

    /* ----------------------------------------------------------
     *  AJAX handlers
     * -------------------------------------------------------- */

    /**
     * AJAX: Save (create / update) a tab set.
     */
    public function ajax_save_tab_set(): void {
        check_ajax_referer( self::NONCE_ACTION, 'nonce' );

        if ( ! current_user_can( self::CAPABILITY ) ) {
            wp_send_json_error( [ 'message' => 'Unauthorized.' ], 403 );
        }

        $tab_set_id   = sanitize_text_field( wp_unslash( $_POST['tab_set_id'] ?? '' ) );
        $tab_set_name = sanitize_text_field( wp_unslash( $_POST['tab_set_name'] ?? '' ) );
        $tabs_raw     = $_POST['tabs'] ?? [];

        if ( '' === $tab_set_name ) {
            wp_send_json_error( [ 'message' => 'Tab set name is required.' ] );
        }

        // Build ID if creating new
        if ( '' === $tab_set_id ) {
            $tab_set_id = $this->generate_id( $tab_set_name );
        }

        $tabs = [];
        if ( is_array( $tabs_raw ) ) {
            foreach ( $tabs_raw as $raw ) {
                $title = sanitize_text_field( wp_unslash( $raw['title'] ?? '' ) );
                if ( '' === $title ) {
                    continue; // skip blank tabs
                }
                $tabs[] = [
                    'title'   => $title,
                    'content' => wp_kses_post( wp_unslash( $raw['content'] ?? '' ) ),
                ];
            }
        }

        if ( empty( $tabs ) ) {
            wp_send_json_error( [ 'message' => 'At least one tab with a title is required.' ] );
        }

        $data = [
            'id'   => $tab_set_id,
            'name' => $tab_set_name,
            'tabs' => $tabs,
        ];

        $this->save_tab_set( $tab_set_id, $data );

        wp_send_json_success( [
            'message' => 'Tab set saved.',
            'id'      => $tab_set_id,
            'data'    => $data,
        ] );
    }

    /**
     * AJAX: Delete a tab set.
     */
    public function ajax_delete_tab_set(): void {
        check_ajax_referer( self::NONCE_ACTION, 'nonce' );

        if ( ! current_user_can( self::CAPABILITY ) ) {
            wp_send_json_error( [ 'message' => 'Unauthorized.' ], 403 );
        }

        $tab_set_id = sanitize_text_field( wp_unslash( $_POST['tab_set_id'] ?? '' ) );

        if ( $this->delete_tab_set( $tab_set_id ) ) {
            wp_send_json_success( [ 'message' => 'Tab set deleted.' ] );
        } else {
            wp_send_json_error( [ 'message' => 'Tab set not found.' ] );
        }
    }

    /**
     * AJAX: Return a single tab set's data as JSON.
     */
    public function ajax_get_tab_set(): void {
        check_ajax_referer( self::NONCE_ACTION, 'nonce' );

        if ( ! current_user_can( self::CAPABILITY ) ) {
            wp_send_json_error( [ 'message' => 'Unauthorized.' ], 403 );
        }

        $tab_set_id = sanitize_text_field( wp_unslash( $_POST['tab_set_id'] ?? '' ) );
        $data       = $this->get_tab_set( $tab_set_id );

        if ( $data ) {
            wp_send_json_success( $data );
        } else {
            wp_send_json_error( [ 'message' => 'Tab set not found.' ] );
        }
    }

    /* ----------------------------------------------------------
     *  Shortcode rendering
     * -------------------------------------------------------- */

    /**
     * [custom_tabs id="tab-set-sample"]
     */
    public function render_shortcode( $atts ): string {
        $atts = shortcode_atts( [
            'id' => '',
        ], $atts, 'custom_tabs' );

        if ( '' === $atts['id'] ) {
            return '<!-- Custom Tabs: no id attribute -->';
        }

        $set = $this->get_tab_set( sanitize_text_field( $atts['id'] ) );

        if ( ! $set || empty( $set['tabs'] ) ) {
            return '<!-- Custom Tabs: set not found or empty -->';
        }

        $uid  = 'tabs-' . esc_attr( $set['id'] );
        $tabs = $set['tabs'];

        ob_start();
        ?>
        <div class="tabs" data-tabs="<?php echo $uid; ?>">

            <div class="tabs__tablist" role="tablist"
                 aria-label="<?php echo esc_attr( $set['name'] ); ?>"
                 data-tab-list>
                <?php foreach ( $tabs as $i => $tab ) : ?>
                    <button class="tabs__tab"
                            type="button"
                            data-tab
                            <?php echo 0 === $i ? 'data-tab-init' : ''; ?>><?php
                        echo esc_html( $tab['title'] );
                    ?></button>
                <?php endforeach; ?>
            </div>

            <?php foreach ( $tabs as $i => $tab ) : ?>
                <div class="tabs__panel" data-tab-panel>
                    <?php echo wp_kses_post( $tab['content'] ); ?>
                </div>
            <?php endforeach; ?>

        </div>
        <?php
        return ob_get_clean();
    }
}

Custom_Tabs_Shortcode_Plugin::get_instance();
