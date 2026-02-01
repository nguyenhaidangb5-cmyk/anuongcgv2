<?php
/**
 * Plugin Name: Cần Giuộc Food Core (Nâng cấp v2.0)
 * Description: Plugin cốt lõi thiết lập cấu trúc dữ liệu cho website Ẩm thực Cần Giuộc - Đã nâng cấp với Taxonomy food_type và Meta Fields dạng Boolean
 * Version: 2.0.0
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
        );

        register_post_type( 'quan_an', $args );
    }

    /**
     * 2. Đăng ký Taxonomies: Loại hình ẩm thực (food_type) & Khu vực
     */
    public function register_taxonomies() {
        // Taxonomy MỚI: Loại hình ẩm thực (food_type)
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

        // Taxonomy: Loại hình (cũ - giữ lại để tương thích)
        register_taxonomy( 'loai_hinh', 'quan_an', array(
            'label'                 => 'Loại hình (Cũ)',
            'labels'                => array(
                'name'              => 'Loại hình (Cũ)',
                'singular_name'     => 'Loại hình',
                'menu_name'         => 'Loại hình (Cũ)',
            ),
            'rewrite'               => array( 'slug' => 'loai-hinh' ),
            'hierarchical'          => true,
            'show_ui'               => true,
            'show_in_rest'          => true,
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

        // Tự động thêm các term mặc định cho food_type
        if ( ! term_exists( 'Cơm/Món nước', 'food_type' ) ) {
            $default_food_types = array( 
                'Cơm/Món nước', 
                'Phở', 
                'Bún', 
                'Hải sản', 
                'Đồ ăn vặt', 
                'Trà sữa/Cafe', 
                'Món chay',
                'Quán nhậu',
                'Đặc sản địa phương'
            );
            foreach ( $default_food_types as $term ) {
                wp_insert_term( $term, 'food_type' );
            }
        }

        // Tự động thêm các term mặc định cho loai_hinh (cũ)
        if ( ! term_exists( 'Cơm/Món nước', 'loai_hinh' ) ) {
            $default_loai_hinh = array( 'Cơm/Món nước', 'Quán nhậu/Hải sản', 'Ăn vặt', 'Cafe/Trà sữa', 'Quán hot', 'Mua mang về/Làm quà' );
            foreach ( $default_loai_hinh as $term ) wp_insert_term( $term, 'loai_hinh' );
        }

        // Tự động thêm các term mặc định cho khu_vuc
        if ( ! term_exists( 'Thị trấn Cần Giuộc', 'khu_vuc' ) ) {
            $default_khu_vuc = array( 'Thị trấn Cần Giuộc', 'Phước Lâm', 'Trường Bình', 'Long Thượng', 'Phước Lý', 'Mỹ Lộc' );
            foreach ( $default_khu_vuc as $term ) wp_insert_term( $term, 'khu_vuc' );
        }
    }

    /**
     * 3. Custom Fields (Metabox - Giao diện nhập liệu)
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
        // Lấy dữ liệu đã lưu
        $phone = get_post_meta( $post->ID, '_cg_phone', true );
        $address = get_post_meta( $post->ID, '_cg_address', true );
        $hours = get_post_meta( $post->ID, '_cg_hours', true );
        $price = get_post_meta( $post->ID, '_cg_price', true );
        $map_link = get_post_meta( $post->ID, '_cg_map_link', true );
        
        // Boolean fields MỚI
        $has_ac = get_post_meta( $post->ID, '_cg_has_ac', true );
        $has_parking = get_post_meta( $post->ID, '_cg_has_parking', true );
        $is_verified = get_post_meta( $post->ID, '_cg_is_verified', true );
        $is_local_choice = get_post_meta( $post->ID, '_cg_is_local_choice', true );
        
        $badges = get_post_meta( $post->ID, '_cg_badges', true ) ?: array();
        
        $rating_food = get_post_meta( $post->ID, '_cg_rating_food', true );
        $rating_price = get_post_meta( $post->ID, '_cg_rating_price', true );
        $rating_service = get_post_meta( $post->ID, '_cg_rating_service', true );
        $rating_ambiance = get_post_meta( $post->ID, '_cg_rating_ambiance', true );

        wp_nonce_field( 'save_cg_meta', 'cg_meta_nonce' );
        ?>
        <style>
            .cg-row { margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
            .cg-label { font-weight: bold; display: block; margin-bottom: 5px; }
            .cg-input { width: 100%; max-width: 400px; }
            .cg-badges-list { display: flex; flex-wrap: wrap; gap: 10px; }
            .cg-badge-item { background: #f0f0f1; padding: 5px 10px; border-radius: 4px; }
            .cg-boolean-section { background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .cg-boolean-item { display: inline-block; margin-right: 20px; margin-bottom: 10px; }
        </style>

        <!-- Thông tin cơ bản -->
        <div class="cg-row">
            <h4>📍 Thông tin cơ bản</h4>
            <p>
                <label class="cg-label">Số điện thoại:</label>
                <input type="text" name="cg_phone" value="<?php echo esc_attr( $phone ); ?>" class="cg-input" />
            </p>
            <p>
                <label class="cg-label">Địa chỉ:</label>
                <input type="text" name="cg_address" value="<?php echo esc_attr( $address ); ?>" class="cg-input" />
            </p>
            <p>
                <label class="cg-label">Giờ mở cửa:</label>
                <input type="text" name="cg_hours" value="<?php echo esc_attr( $hours ); ?>" class="cg-input" placeholder="VD: 07:00 - 22:00" />
            </p>
            <p>
                <label class="cg-label">Khoảng giá:</label>
                <input type="text" name="cg_price" value="<?php echo esc_attr( $price ); ?>" class="cg-input" placeholder="VD: 25.000đ - 50.000đ" />
            </p>
            <p>
                <label class="cg-label">Link bản đồ (Google Maps):</label>
                <input type="text" name="cg_map_link" value="<?php echo esc_attr( $map_link ); ?>" class="cg-input" />
            </p>
        </div>

        <!-- Tiện ích Boolean (MỚI) -->
        <div class="cg-row">
            <h4>✅ Tiện ích & Xác thực (Checkbox)</h4>
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
            </div>
        </div>

        <!-- Hệ thống Nhãn (Badges - Giữ nguyên) -->
        <div class="cg-row">
            <h4>🏷️ Nhãn dán độc quyền</h4>
            <div class="cg-badges-list">
                <?php 
                $all_badges = array(
                    'has_ac' => 'Có máy lạnh',
                    'local_choice' => 'Dân địa phương chọn',
                    'free_parking' => 'Giữ xe miễn phí',
                    'verified' => 'Đã xác thực',
                    'new_open' => 'Quán mới',
                    'has_alcohol' => 'Có bán rượu bia',
                    'authentic' => 'Quán ngon chuẩn vị',
                    'admin_choice' => 'Admin khuyên dùng',
                    'family_friendly' => 'Phù hợp gia đình',
                    'good_cheap' => 'Ngon, bổ, rẻ',
                    'nice_view' => 'View sống ảo',
                    'trending' => 'Đang hot (Trending)',
                    'fast_delivery' => 'Giao hàng nhanh',
                    'online_only' => 'Chỉ bán online'
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
            <h4>⭐ Đánh giá (Thang điểm 1-10)</h4>
            <div style="display: flex; gap: 20px;">
                <div>
                    <label class="cg-label">Chất lượng:</label>
                    <input type="number" name="cg_rating_food" value="<?php echo esc_attr( $rating_food ); ?>" min="0" max="10" step="0.5" />
                </div>
                <div>
                    <label class="cg-label">Giá cả:</label>
                    <input type="number" name="cg_rating_price" value="<?php echo esc_attr( $rating_price ); ?>" min="0" max="10" step="0.5" />
                </div>
                <div>
                    <label class="cg-label">Phục vụ:</label>
                    <input type="number" name="cg_rating_service" value="<?php echo esc_attr( $rating_service ); ?>" min="0" max="10" step="0.5" />
                </div>
                <div>
                    <label class="cg-label">Không gian:</label>
                    <input type="number" name="cg_rating_ambiance" value="<?php echo esc_attr( $rating_ambiance ); ?>" min="0" max="10" step="0.5" />
                </div>
            </div>
        </div>
        <?php
    }

    public function save_custom_meta_data( $post_id ) {
        if ( ! isset( $_POST['cg_meta_nonce'] ) || ! wp_verify_nonce( $_POST['cg_meta_nonce'], 'save_cg_meta' ) ) return;
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
        if ( ! current_user_can( 'edit_post', $post_id ) ) return;

        // Lưu thông tin cơ bản
        $text_fields = array( 'cg_phone', 'cg_address', 'cg_hours', 'cg_price', 'cg_map_link', 'cg_rating_food', 'cg_rating_price', 'cg_rating_service', 'cg_rating_ambiance' );
        foreach ( $text_fields as $field ) {
            if ( isset( $_POST[ $field ] ) ) {
                update_post_meta( $post_id, '_' . $field, sanitize_text_field( $_POST[ $field ] ) );
            }
        }

        // Lưu Boolean fields MỚI
        $boolean_fields = array( 'cg_has_ac', 'cg_has_parking', 'cg_is_verified', 'cg_is_local_choice' );
        foreach ( $boolean_fields as $field ) {
            $value = isset( $_POST[ $field ] ) ? '1' : '0';
            update_post_meta( $post_id, '_' . $field, $value );
        }

        // Lưu Badges (Mảng)
        if ( isset( $_POST['cg_badges'] ) ) {
            $badges = array_map( 'sanitize_text_field', $_POST['cg_badges'] );
            update_post_meta( $post_id, '_cg_badges', $badges );
        } else {
            delete_post_meta( $post_id, '_cg_badges' );
        }
    }

    /**
     * 4. Đăng ký Fields vào REST API để Next.js lấy được
     */
    public function register_rest_fields() {
        // Đăng ký các field text
        $fields = array( 'phone', 'address', 'hours', 'price', 'map_link', 'rating_food', 'rating_price', 'rating_service', 'rating_ambiance' );
        foreach ( $fields as $field ) {
            register_rest_field( 'quan_an', $field, array(
                'get_callback' => function( $object ) use ( $field ) {
                    return get_post_meta( $object['id'], '_cg_' . $field, true );
                },
                'update_callback' => null,
                'schema' => null,
            ));
        }

        // Đăng ký Boolean fields MỚI
        $boolean_fields = array( 'has_ac', 'has_parking', 'is_verified', 'is_local_choice' );
        foreach ( $boolean_fields as $field ) {
            register_rest_field( 'quan_an', $field, array(
                'get_callback' => function( $object ) use ( $field ) {
                    $value = get_post_meta( $object['id'], '_cg_' . $field, true );
                    return $value === '1' ? true : false; // Trả về boolean
                },
                'update_callback' => null,
                'schema' => array(
                    'type' => 'boolean',
                    'description' => 'Boolean field: ' . $field
                ),
            ));
        }

        // Đăng ký field badges (Mảng)
        register_rest_field( 'quan_an', 'badges', array(
            'get_callback' => function( $object ) {
                return get_post_meta( $object['id'], '_cg_badges', true ) ?: array();
            },
            'update_callback' => null,
            'schema' => null,
        ));

        // Đăng ký featured_media_url
        register_rest_field( 'quan_an', 'featured_media_url', array(
            'get_callback' => function( $object ) {
                $image_id = $object['featured_media'];
                if ( $image_id ) {
                    $image_url = wp_get_attachment_image_url( $image_id, 'large' );
                    return $image_url ?: null;
                }
                return null;
            },
            'update_callback' => null,
            'schema' => null,
        ));
    }

    /**
     * 5. API Custom Endpoint: Nhận form liên hệ
     * POST /wp-json/can-giuoc-food/v1/contact
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
        $sent = wp_mail( $admin_email, $subject, $body );

        $post_id = wp_insert_post( array(
            'post_title'    => "$store_name ($type)",
            'post_content'  => $body,
            'post_status'   => 'publish',
            'post_type'     => 'contact_request',
        ));
        
        return new WP_REST_Response( array( 
            'success' => true, 
            'message' => 'Đã nhận thông tin',
            'sent_to' => $admin_email,
            'db_id'   => $post_id
        ), 200 );
    }
}

new Can_Giuoc_Food_Core();
