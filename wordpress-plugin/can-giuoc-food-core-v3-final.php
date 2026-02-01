<?php
/**
 * Plugin Name: Cần Giuộc Food Core (Final v3.0)
 * Description: Plugin hoàn chỉnh với Price Range dropdown, API Search & Sort - Sẵn sàng Production
 * Version: 3.0.0
 * Author: Antigravity Agent
 * Text Domain: can-giuoc-food
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Can_Giuoc_Food_Core {

    public function __construct() {
        add_action( 'init', array( $this, 'register_cpt_quan_an' ) );
        add_action( 'init', array( $this, 'register_taxonomies' ) );
        add_action( 'add_meta_boxes', array( $this, 'add_custom_meta_boxes' ) );
        add_action( 'save_post', array( $this, 'save_custom_meta_data' ) );
        add_action( 'rest_api_init', array( $this, 'register_rest_fields' ) );
        add_action( 'rest_api_init', array( $this, 'register_contact_endpoint' ) );
        
        // Thêm hỗ trợ search trong REST API
        add_filter( 'rest_quan_an_query', array( $this, 'custom_rest_query' ), 10, 2 );
    }

    /**
     * 1. Đăng ký Custom Post Type: Quán Ăn
     */
    public function register_cpt_quan_an() {
        $labels = array(
            'name'                  => 'Quán Ăn',
            'singular_name'         => 'Quán Ăn',
            'menu_name'             => 'Quán Ăn',
            'add_new'               => 'Thêm Quán Mới',
            'add_new_item'          => 'Thêm Quán Ăn Mới',
            'edit_item'             => 'Chỉnh Sửa Quán',
            'new_item'              => 'Quán Mới',
            'view_item'             => 'Xem Quán',
            'search_items'          => 'Tìm Quán Ăn',
            'not_found'             => 'Không tìm thấy quán nào',
            'not_found_in_trash'    => 'Không có quán nào trong thùng rác',
        );

        $args = array(
            'labels'                => $labels,
            'supports'              => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
            'public'                => true,
            'show_ui'               => true,
            'show_in_menu'          => true,
            'menu_position'         => 5,
            'menu_icon'             => 'dashicons-food',
            'show_in_rest'          => true,
            'has_archive'           => true,
            'rewrite'               => array( 'slug' => 'quan-an' ),
            'rest_base'             => 'quan_an',
        );

        register_post_type( 'quan_an', $args );
    }

    /**
     * 2. Đăng ký Taxonomies
     */
    public function register_taxonomies() {
        // Taxonomy: Loại hình ẩm thực (food_type)
        register_taxonomy( 'food_type', 'quan_an', array(
            'label'                 => 'Loại hình ẩm thực',
            'labels'                => array(
                'name'              => 'Loại hình ẩm thực',
                'singular_name'     => 'Loại hình',
                'menu_name'         => 'Loại hình',
                'all_items'         => 'Tất cả loại hình',
                'edit_item'         => 'Sửa loại hình',
                'add_new_item'      => 'Thêm loại hình mới',
            ),
            'rewrite'               => array( 'slug' => 'food-type' ),
            'hierarchical'          => true,
            'show_ui'               => true,
            'show_in_rest'          => true,
            'show_admin_column'     => true,
        ));

        // Taxonomy: Khu vực
        register_taxonomy( 'khu_vuc', 'quan_an', array(
            'label'                 => 'Khu vực',
            'labels'                => array(
                'name'              => 'Khu vực',
                'singular_name'     => 'Khu vực',
                'menu_name'         => 'Khu vực',
            ),
            'rewrite'               => array( 'slug' => 'khu-vuc' ),
            'hierarchical'          => true,
            'show_ui'               => true,
            'show_in_rest'          => true,
            'show_admin_column'     => true,
        ));

        // Tự động thêm terms mặc định
        $this->create_default_terms();
    }

    private function create_default_terms() {
        // Food types
        if ( ! term_exists( 'Cơm/Món nước', 'food_type' ) ) {
            $food_types = array( 
                'Cơm/Món nước', 'Phở', 'Bún', 'Hải sản', 
                'Đồ ăn vặt', 'Trà sữa/Cafe', 'Món chay', 
                'Quán nhậu', 'Đặc sản địa phương'
            );
            foreach ( $food_types as $term ) {
                wp_insert_term( $term, 'food_type' );
            }
        }

        // Khu vực
        if ( ! term_exists( 'Thị trấn Cần Giuộc', 'khu_vuc' ) ) {
            $khu_vuc = array( 
                'Thị trấn Cần Giuộc', 'Phước Lâm', 'Trường Bình', 
                'Long Thượng', 'Phước Lý', 'Mỹ Lộc' 
            );
            foreach ( $khu_vuc as $term ) {
                wp_insert_term( $term, 'khu_vuc' );
            }
        }
    }

    /**
     * 3. Meta Box
     */
    public function add_custom_meta_boxes() {
        add_meta_box(
            'thong_tin_quan_meta_box',
            'Thông Tin Chi Tiết Quán',
            array( $this, 'render_meta_box' ),
            'quan_an',
            'normal',
            'high'
        );
    }

    public function render_meta_box( $post ) {
        // Lấy dữ liệu
        $phone = get_post_meta( $post->ID, '_cg_phone', true );
        $address = get_post_meta( $post->ID, '_cg_address', true );
        $hours = get_post_meta( $post->ID, '_cg_hours', true );
        $price_range = get_post_meta( $post->ID, '_cg_price_range', true ); // MỚI: dropdown
        $map_link = get_post_meta( $post->ID, '_cg_map_link', true );
        
        $has_ac = get_post_meta( $post->ID, '_cg_has_ac', true );
        $has_parking = get_post_meta( $post->ID, '_cg_has_parking', true );
        $is_verified = get_post_meta( $post->ID, '_cg_is_verified', true );
        $is_local_choice = get_post_meta( $post->ID, '_cg_is_local_choice', true );
        $is_new = get_post_meta( $post->ID, '_cg_is_new', true ); // MỚI: Quán mới
        
        $badges = get_post_meta( $post->ID, '_cg_badges', true ) ?: array();
        
        $rating_food = get_post_meta( $post->ID, '_cg_rating_food', true );
        $rating_price = get_post_meta( $post->ID, '_cg_rating_price', true );
        $rating_service = get_post_meta( $post->ID, '_cg_rating_service', true );
        $rating_ambiance = get_post_meta( $post->ID, '_cg_rating_ambiance', true );

        wp_nonce_field( 'save_cg_meta', 'cg_meta_nonce' );
        ?>
        <style>
            .cg-row { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
            .cg-label { font-weight: bold; display: block; margin-bottom: 8px; font-size: 13px; }
            .cg-input { width: 100%; max-width: 500px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
            .cg-select { width: 100%; max-width: 300px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
            .cg-badges-list { display: flex; flex-wrap: wrap; gap: 10px; }
            .cg-badge-item { background: #f0f0f1; padding: 8px 12px; border-radius: 6px; }
            .cg-boolean-section { background: #e8f5e9; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .cg-boolean-item { display: inline-block; margin-right: 25px; margin-bottom: 12px; }
            .cg-boolean-item input[type="checkbox"] { margin-right: 6px; width: 18px; height: 18px; vertical-align: middle; }
            .cg-price-options { display: flex; gap: 15px; flex-wrap: wrap; }
            .cg-price-option { background: #fff; border: 2px solid #ddd; padding: 10px 15px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
            .cg-price-option:hover { border-color: #ff9800; }
            .cg-price-option input[type="radio"] { margin-right: 8px; }
            .cg-price-option.selected { border-color: #ff9800; background: #fff3e0; }
        </style>

        <!-- Thông tin cơ bản -->
        <div class="cg-row">
            <h3 style="margin-top: 0; color: #333;">📍 Thông tin cơ bản</h3>
            <p>
                <label class="cg-label">Số điện thoại:</label>
                <input type="text" name="cg_phone" value="<?php echo esc_attr( $phone ); ?>" class="cg-input" placeholder="VD: 0901234567" />
            </p>
            <p>
                <label class="cg-label">Địa chỉ:</label>
                <input type="text" name="cg_address" value="<?php echo esc_attr( $address ); ?>" class="cg-input" placeholder="VD: 123 Đường ABC, Cần Giuộc" />
            </p>
            <p>
                <label class="cg-label">Giờ mở cửa:</label>
                <input type="text" name="cg_hours" value="<?php echo esc_attr( $hours ); ?>" class="cg-input" placeholder="VD: 07:00 - 22:00" />
            </p>
            <p>
                <label class="cg-label">Link bản đồ (Google Maps):</label>
                <input type="text" name="cg_map_link" value="<?php echo esc_attr( $map_link ); ?>" class="cg-input" placeholder="https://maps.google.com/..." />
            </p>
        </div>

        <!-- Khoảng giá (DROPDOWN/RADIO) -->
        <div class="cg-row">
            <h3 style="margin-top: 0; color: #333;">💰 Khoảng giá (Chọn 1 mức)</h3>
            <div class="cg-price-options">
                <?php
                $price_options = array(
                    'under-30k' => 'Dưới 30.000đ',
                    '30k-50k' => '30.000đ - 50.000đ',
                    '50k-100k' => '50.000đ - 100.000đ',
                    'over-100k' => 'Trên 100.000đ'
                );
                foreach ( $price_options as $value => $label ) :
                    $checked = ( $price_range === $value ) ? 'checked' : '';
                    $selected_class = ( $price_range === $value ) ? 'selected' : '';
                ?>
                    <label class="cg-price-option <?php echo $selected_class; ?>">
                        <input type="radio" name="cg_price_range" value="<?php echo $value; ?>" <?php echo $checked; ?> />
                        <strong><?php echo $label; ?></strong>
                    </label>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- Tiện ích Boolean -->
        <div class="cg-row">
            <h3 style="margin-top: 0; color: #333;">✅ Tiện ích & Đặc điểm</h3>
            <div class="cg-boolean-section">
                <div class="cg-boolean-item">
                    <label>
                        <input type="checkbox" name="cg_has_ac" value="1" <?php checked( $has_ac, '1' ); ?> />
                        <strong>❄️ Có máy lạnh</strong>
                    </label>
                </div>
                <div class="cg-boolean-item">
                    <label>
                        <input type="checkbox" name="cg_has_parking" value="1" <?php checked( $has_parking, '1' ); ?> />
                        <strong>🛵 Có chỗ giữ xe</strong>
                    </label>
                </div>
                <div class="cg-boolean-item">
                    <label>
                        <input type="checkbox" name="cg_is_verified" value="1" <?php checked( $is_verified, '1' ); ?> />
                        <strong>✅ Đã xác thực bởi Admin</strong>
                    </label>
                </div>
                <div class="cg-boolean-item">
                    <label>
                        <input type="checkbox" name="cg_is_local_choice" value="1" <?php checked( $is_local_choice, '1' ); ?> />
                        <strong>🏠 Lựa chọn của dân địa phương</strong>
                    </label>
                </div>
                <div class="cg-boolean-item">
                    <label>
                        <input type="checkbox" name="cg_is_new" value="1" <?php checked( $is_new, '1' ); ?> />
                        <strong>🆕 Quán mới</strong>
                    </label>
                </div>
            </div>
        </div>

        <!-- Hệ thống Nhãn (Badges) -->
        <div class="cg-row">
            <h3 style="margin-top: 0; color: #333;">🏷️ Nhãn dán độc quyền</h3>
            <div class="cg-badges-list">
                <?php 
                $all_badges = array(
                    'has_ac' => '❄️ Có máy lạnh',
                    'local_choice' => '🏠 Dân địa phương chọn',
                    'free_parking' => '🛵 Giữ xe miễn phí',
                    'verified' => '✅ Đã xác thực',
                    'new_open' => '🆕 Quán mới',
                    'has_alcohol' => '🍺 Có bán rượu bia',
                    'authentic' => '🍜 Quán ngon chuẩn vị',
                    'admin_choice' => '⭐ Admin khuyên dùng',
                    'family_friendly' => '👨‍👩‍👧‍👦 Phù hợp gia đình',
                    'good_cheap' => '💰 Ngon, bổ, rẻ',
                    'nice_view' => '📸 View sống ảo',
                    'trending' => '🔥 Đang hot',
                    'fast_delivery' => '🚀 Giao hàng nhanh',
                    'online_only' => '📱 Chỉ bán online'
                );
                foreach ( $all_badges as $key => $label ) : ?>
                    <label class="cg-badge-item">
                        <input type="checkbox" name="cg_badges[]" value="<?php echo $key; ?>" <?php checked( in_array( $key, $badges ) ); ?> />
                        <?php echo $label; ?>
                    </label>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- Thang điểm -->
        <div class="cg-row">
            <h3 style="margin-top: 0; color: #333;">⭐ Đánh giá (Thang điểm 1-10)</h3>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                <div>
                    <label class="cg-label">🍽️ Chất lượng:</label>
                    <input type="number" name="cg_rating_food" value="<?php echo esc_attr( $rating_food ); ?>" min="0" max="10" step="0.5" style="width: 100%; padding: 8px;" />
                </div>
                <div>
                    <label class="cg-label">💵 Giá cả:</label>
                    <input type="number" name="cg_rating_price" value="<?php echo esc_attr( $rating_price ); ?>" min="0" max="10" step="0.5" style="width: 100%; padding: 8px;" />
                </div>
                <div>
                    <label class="cg-label">👨‍🍳 Phục vụ:</label>
                    <input type="number" name="cg_rating_service" value="<?php echo esc_attr( $rating_service ); ?>" min="0" max="10" step="0.5" style="width: 100%; padding: 8px;" />
                </div>
                <div>
                    <label class="cg-label">🏪 Không gian:</label>
                    <input type="number" name="cg_rating_ambiance" value="<?php echo esc_attr( $rating_ambiance ); ?>" min="0" max="10" step="0.5" style="width: 100%; padding: 8px;" />
                </div>
            </div>
        </div>

        <script>
        jQuery(document).ready(function($) {
            // Highlight selected price option
            $('input[name="cg_price_range"]').on('change', function() {
                $('.cg-price-option').removeClass('selected');
                $(this).closest('.cg-price-option').addClass('selected');
            });
        });
        </script>
        <?php
    }

    public function save_custom_meta_data( $post_id ) {
        if ( ! isset( $_POST['cg_meta_nonce'] ) || ! wp_verify_nonce( $_POST['cg_meta_nonce'], 'save_cg_meta' ) ) return;
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
        if ( ! current_user_can( 'edit_post', $post_id ) ) return;

        // Lưu text fields
        $text_fields = array( 'cg_phone', 'cg_address', 'cg_hours', 'cg_map_link', 'cg_rating_food', 'cg_rating_price', 'cg_rating_service', 'cg_rating_ambiance' );
        foreach ( $text_fields as $field ) {
            if ( isset( $_POST[ $field ] ) ) {
                update_post_meta( $post_id, '_' . $field, sanitize_text_field( $_POST[ $field ] ) );
            }
        }

        // Lưu Price Range (dropdown)
        if ( isset( $_POST['cg_price_range'] ) ) {
            update_post_meta( $post_id, '_cg_price_range', sanitize_text_field( $_POST['cg_price_range'] ) );
        }

        // Lưu Boolean fields
        $boolean_fields = array( 'cg_has_ac', 'cg_has_parking', 'cg_is_verified', 'cg_is_local_choice', 'cg_is_new' );
        foreach ( $boolean_fields as $field ) {
            $value = isset( $_POST[ $field ] ) ? '1' : '0';
            update_post_meta( $post_id, '_' . $field, $value );
        }

        // Lưu Badges
        if ( isset( $_POST['cg_badges'] ) ) {
            $badges = array_map( 'sanitize_text_field', $_POST['cg_badges'] );
            update_post_meta( $post_id, '_cg_badges', $badges );
        } else {
            delete_post_meta( $post_id, '_cg_badges' );
        }
    }

    /**
     * 4. REST API Fields
     */
    public function register_rest_fields() {
        // Text fields
        $fields = array( 'phone', 'address', 'hours', 'map_link', 'rating_food', 'rating_price', 'rating_service', 'rating_ambiance' );
        foreach ( $fields as $field ) {
            register_rest_field( 'quan_an', $field, array(
                'get_callback' => function( $object ) use ( $field ) {
                    return get_post_meta( $object['id'], '_cg_' . $field, true );
                },
                'schema' => array( 'type' => 'string' ),
            ));
        }

        // Price Range (dropdown value)
        register_rest_field( 'quan_an', 'price_range', array(
            'get_callback' => function( $object ) {
                return get_post_meta( $object['id'], '_cg_price_range', true );
            },
            'schema' => array( 'type' => 'string' ),
        ));

        // Price Range Label (hiển thị)
        register_rest_field( 'quan_an', 'price', array(
            'get_callback' => function( $object ) {
                $range = get_post_meta( $object['id'], '_cg_price_range', true );
                $labels = array(
                    'under-30k' => 'Dưới 30.000đ',
                    '30k-50k' => '30.000đ - 50.000đ',
                    '50k-100k' => '50.000đ - 100.000đ',
                    'over-100k' => 'Trên 100.000đ'
                );
                return isset( $labels[$range] ) ? $labels[$range] : 'Đang cập nhật';
            },
            'schema' => array( 'type' => 'string' ),
        ));

        // Boolean fields
        $boolean_fields = array( 'has_ac', 'has_parking', 'is_verified', 'is_local_choice', 'is_new' );
        foreach ( $boolean_fields as $field ) {
            register_rest_field( 'quan_an', $field, array(
                'get_callback' => function( $object ) use ( $field ) {
                    $value = get_post_meta( $object['id'], '_cg_' . $field, true );
                    return $value === '1';
                },
                'schema' => array( 'type' => 'boolean' ),
            ));
        }

        // Badges
        register_rest_field( 'quan_an', 'badges', array(
            'get_callback' => function( $object ) {
                return get_post_meta( $object['id'], '_cg_badges', true ) ?: array();
            },
            'schema' => array( 'type' => 'array' ),
        ));

        // Featured Image URL
        register_rest_field( 'quan_an', 'featured_media_url', array(
            'get_callback' => function( $object ) {
                $image_id = $object['featured_media'];
                if ( $image_id ) {
                    return wp_get_attachment_image_url( $image_id, 'large' );
                }
                return null;
            },
            'schema' => array( 'type' => 'string' ),
        ));
    }

    /**
     * 5. Custom REST Query - Hỗ trợ Search & Sort
     */
    public function custom_rest_query( $args, $request ) {
        // Search by keyword (tìm trong title và content)
        if ( ! empty( $request['search'] ) ) {
            $args['s'] = sanitize_text_field( $request['search'] );
        }

        // Sort by date (newest first)
        if ( ! empty( $request['orderby'] ) && $request['orderby'] === 'date' ) {
            $args['orderby'] = 'date';
            $args['order'] = 'DESC';
        }

        return $args;
    }

    /**
     * 6. Contact Endpoint
     */
    public function register_contact_endpoint() {
        register_rest_route( 'can-giuoc-food/v1', '/contact', array(
            'methods' => 'POST',
            'callback' => array( $this, 'handle_contact_submission' ),
            'permission_callback' => '__return_true',
        ));
    }

    public function handle_contact_submission( $request ) {
        $params = $request->get_json_params();
        
        if ( empty( $params['store_name'] ) ) {
            return new WP_Error( 'missing_data', 'Vui lòng nhập tên quán', array( 'status' => 400 ) );
        }

        $type = isset( $params['type'] ) ? $params['type'] : 'unknown';
        $store_name = sanitize_text_field( $params['store_name'] );
        $address = sanitize_text_field( $params['address'] );
        $message = sanitize_textarea_field( $params['message'] );
        
        $subject = "[Liên Hệ Mới] Từ " . ($type === 'owner' ? 'CHỦ QUÁN' : 'NGƯỜI REVIEW');
        
        $body = "Có thông tin mới từ website:\n\n";
        $body .= "Loại: " . ($type === 'owner' ? 'Chủ quán đăng ký' : 'Người dùng giới thiệu') . "\n";
        $body .= "Tên quán: $store_name\n";
        $body .= "Địa chỉ: $address\n";
        
        if ( $type === 'owner' ) {
            $phone = sanitize_text_field( $params['phone'] );
            $body .= "Số điện thoại: $phone\n";
        } else {
            $food = sanitize_text_field( $params['recommend_food'] );
            $body .= "Món ngon đề xuất: $food\n";
        }
        
        $body .= "Lời nhắn: $message\n";

        $admin_email = get_option( 'admin_email' );
        wp_mail( $admin_email, $subject, $body );
        
        return new WP_REST_Response( array( 
            'success' => true, 
            'message' => 'Đã nhận thông tin'
        ), 200 );
    }
}

new Can_Giuoc_Food_Core();
