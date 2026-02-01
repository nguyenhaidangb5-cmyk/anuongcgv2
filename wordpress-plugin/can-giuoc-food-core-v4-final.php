<?php
/**
 * Plugin Name: Cần Giuộc Food Core (v4.0 - Optimized)
 * Description: Plugin tối ưu với Meta Box hợp nhất, API response đầy đủ thumbnail_url và formatted_price
 * Version: 4.0.0
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
        add_action( 'init', array( $this, 'register_cpt_submission' ) );
        add_action( 'add_meta_boxes', array( $this, 'add_custom_meta_boxes' ) );
        add_action( 'add_meta_boxes', array( $this, 'add_submission_meta_boxes' ) );
        add_action( 'save_post', array( $this, 'save_custom_meta_data' ) );
        add_action( 'rest_api_init', array( $this, 'register_rest_fields' ) );
        add_action( 'rest_api_init', array( $this, 'register_contact_endpoint' ) );
        add_filter( 'rest_quan_an_query', array( $this, 'custom_rest_query' ), 10, 2 );
        add_action( 'admin_menu', array( $this, 'register_import_menu' ) );
        add_filter( 'rest_quan_an_collection_params', array( $this, 'relax_rest_limit' ), 10, 1 );
    }

    /**
     * Nới lỏng giới hạn số lượng bài viết mỗi trang cho REST API
     */
    public function relax_rest_limit( $params ) {
        if ( isset( $params['per_page'] ) ) {
            $params['per_page']['maximum'] = 500; // Cho phép lấy tối đa 500 bản ghi
        }
        return $params;
    }

    /**
     * 1. Đăng ký Custom Post Type
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
     * 1b. Đăng ký CPT cho Tin nhắn Liên hệ/Đăng ký
     */
    public function register_cpt_submission() {
        $labels = array(
            'name'                  => 'Liên Hệ/Đăng Ký',
            'singular_name'         => 'Tin nhắn',
            'menu_name'             => 'Liên Hệ/Đăng Ký',
            'add_new'               => 'Thêm mới',
            'all_items'             => 'Tất cả tin nhắn',
        );

        $args = array(
            'labels'                => $labels,
            'supports'              => array( 'title' ),
            'public'                => false,
            'show_ui'               => true,
            'show_in_menu'          => true,
            'menu_position'         => 6,
            'menu_icon'             => 'dashicons-email-alt',
            'has_archive'           => false,
            'capability_type'       => 'post',
            'capabilities'          => array(
                'create_posts' => false, // Không cho phép admin tạo tay tin nhắn
            ),
            'map_meta_cap'          => true,
        );

        register_post_type( 'cg_submission', $args );
    }

    /**
     * 2. Đăng ký Taxonomies
     */
    public function register_taxonomies() {
        // Taxonomy: Loại hình ẩm thực
        register_taxonomy( 'food_type', 'quan_an', array(
            'label'                 => 'Loại hình ẩm thực',
            'labels'                => array(
                'name'              => 'Loại hình ẩm thực',
                'singular_name'     => 'Loại hình',
                'menu_name'         => 'Loại hình',
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
            ),
            'rewrite'               => array( 'slug' => 'khu-vuc' ),
            'hierarchical'          => true,
            'show_ui'               => true,
            'show_in_rest'          => true,
            'show_admin_column'     => true,
        ));

        $this->create_default_terms();
    }

    private function create_default_terms() {
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

        if ( taxonomy_exists('khu_vuc') ) {
            $new_locations = array(
                'Thị trấn Cần Giuộc',
                'Xã Phước Lý',
                'Xã Mỹ Lộc',
                'Xã Phước Vĩnh Tây',
                'Xã Tân Tập'
            );

            // 1. Lấy tất cả terms hiện có
            $all_terms = get_terms( array(
                'taxonomy' => 'khu_vuc',
                'hide_empty' => false,
            ) );

            // 2. Xóa các term không nằm trong danh sách chuẩn
            if ( ! is_wp_error( $all_terms ) ) {
                foreach ( $all_terms as $term ) {
                    if ( ! in_array( $term->name, $new_locations ) ) {
                        wp_delete_term( $term->term_id, 'khu_vuc' );
                    }
                }
            }

            // 3. Thêm mới các term chuẩn
            foreach ( $new_locations as $location ) {
                if ( ! term_exists( $location, 'khu_vuc' ) ) {
                    wp_insert_term( $location, 'khu_vuc' );
                }
            }
        }
    }

    /**
     * 3. Meta Box HỢP NHẤT - "Thông tin & Tiện ích"
     */
    public function add_custom_meta_boxes() {
        add_meta_box(
            'thong_tin_tien_ich_meta_box',
            '📋 Thông tin & Tiện ích',
            array( $this, 'render_meta_box' ),
            'quan_an',
            'normal',
            'high'
        );
    }

    /**
     * Meta Box cho Submission
     */
    public function add_submission_meta_boxes() {
        add_meta_box(
            'submission_detail_meta_box',
            '📩 Chi tiết Tin nhắn',
            array( $this, 'render_submission_meta_box' ),
            'cg_submission',
            'normal',
            'high'
        );
    }

    public function render_submission_meta_box( $post ) {
        $type = get_post_meta( $post->ID, '_sub_type', true );
        $store_name = get_post_meta( $post->ID, '_sub_store_name', true );
        $address = get_post_meta( $post->ID, '_sub_address', true );
        $phone = get_post_meta( $post->ID, '_sub_phone', true );
        $food = get_post_meta( $post->ID, '_sub_recommend_food', true );
        $message = get_post_meta( $post->ID, '_sub_message', true );
        ?>
        <table class="form-table">
            <tr>
                <th>Loại yêu cầu:</th>
                <td><strong><?php echo ($type === 'owner' ? 'Chủ quán đăng ký' : 'Người dùng giới thiệu'); ?></strong></td>
            </tr>
            <tr>
                <th>Tên quán:</th>
                <td><?php echo esc_html( $store_name ); ?></td>
            </tr>
            <tr>
                <th>Địa chỉ:</th>
                <td><?php echo esc_html( $address ); ?></td>
            </tr>
            <?php if ($phone): ?>
            <tr>
                <th>Số điện thoại:</th>
                <td><a href="tel:<?php echo esc_attr($phone); ?>"><?php echo esc_html( $phone ); ?></a></td>
            </tr>
            <?php endif; ?>
            <?php if ($food): ?>
            <tr>
                <th>Món ngon:</th>
                <td><?php echo esc_html( $food ); ?></td>
            </tr>
            <?php endif; ?>
            <tr>
                <th>Lời nhắn:</th>
                <td><?php echo nl2br( esc_html( $message ) ); ?></td>
            </tr>
            <tr>
                <th>Thời gian:</th>
                <td><?php echo get_the_date( 'd/m/Y H:i', $post->ID ); ?></td>
            </tr>
        </table>
        <?php
    }

    public function render_meta_box( $post ) {
        // Lấy dữ liệu
        $phone = get_post_meta( $post->ID, '_cg_phone', true );
        $address = get_post_meta( $post->ID, '_cg_address', true );
        $hours = get_post_meta( $post->ID, '_cg_hours', true );
        $price_range = get_post_meta( $post->ID, '_cg_price_range', true );
        $map_link = get_post_meta( $post->ID, '_cg_map_link', true );
        
        // Boolean fields (Tiện ích)
        $has_ac = get_post_meta( $post->ID, '_cg_has_ac', true );
        $has_parking = get_post_meta( $post->ID, '_cg_has_parking', true );
        $is_verified = get_post_meta( $post->ID, '_cg_is_verified', true );
        $is_local_choice = get_post_meta( $post->ID, '_cg_is_local_choice', true );
        $is_new = get_post_meta( $post->ID, '_cg_is_new', true );
        $is_trending = get_post_meta( $post->ID, '_cg_is_trending', true );
        $is_family_friendly = get_post_meta( $post->ID, '_cg_is_family_friendly', true );
        $has_nice_view = get_post_meta( $post->ID, '_cg_has_nice_view', true );
        $is_good_cheap = get_post_meta( $post->ID, '_cg_is_good_cheap', true );
        $is_authentic = get_post_meta( $post->ID, '_cg_is_authentic', true );
        $has_alcohol = get_post_meta( $post->ID, '_cg_has_alcohol', true );
        $is_shipping = get_post_meta( $post->ID, '_cg_is_shipping', true );
        
        $rating_food = get_post_meta( $post->ID, '_cg_rating_food', true );
        $rating_price = get_post_meta( $post->ID, '_cg_rating_price', true );
        $rating_service = get_post_meta( $post->ID, '_cg_rating_service', true );
        $rating_ambiance = get_post_meta( $post->ID, '_cg_rating_ambiance', true );

        wp_nonce_field( 'save_cg_meta', 'cg_meta_nonce' );
        ?>
        <style>
            .cg-meta-container { max-width: 1200px; }
            .cg-section { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .cg-section-title { font-size: 16px; font-weight: 700; color: #333; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #ff9800; display: flex; align-items: center; gap: 8px; }
            .cg-field { margin-bottom: 15px; }
            .cg-label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #555; }
            .cg-input { width: 100%; max-width: 500px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
            .cg-price-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
            .cg-price-option { background: #f9f9f9; border: 2px solid #ddd; padding: 12px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 10px; }
            .cg-price-option:hover { border-color: #ff9800; background: #fff3e0; }
            .cg-price-option.selected { border-color: #ff9800; background: #fff3e0; box-shadow: 0 2px 8px rgba(255, 152, 0, 0.2); }
            .cg-price-option input[type="radio"] { margin: 0; }
            .cg-amenities-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
            .cg-amenity-item { background: #f5f5f5; border: 2px solid #e0e0e0; padding: 12px 16px; border-radius: 8px; transition: all 0.2s; cursor: pointer; }
            .cg-amenity-item:hover { background: #e8f5e9; border-color: #4caf50; }
            .cg-amenity-item.checked { background: #e8f5e9; border-color: #4caf50; }
            .cg-amenity-item input[type="checkbox"] { margin-right: 8px; width: 18px; height: 18px; vertical-align: middle; }
            .cg-amenity-item label { cursor: pointer; font-weight: 500; font-size: 13px; display: flex; align-items: center; gap: 8px; margin: 0; }
            .cg-ratings-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
            .cg-rating-field input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
        </style>

        <div class="cg-meta-container">
            
            <!-- Thông tin cơ bản -->
            <div class="cg-section">
                <h3 class="cg-section-title"><span>📍</span> Thông tin cơ bản</h3>
                <div class="cg-field">
                    <label class="cg-label">Số điện thoại:</label>
                    <input type="text" name="cg_phone" value="<?php echo esc_attr( $phone ); ?>" class="cg-input" placeholder="VD: 0901234567" />
                </div>
                <div class="cg-field">
                    <label class="cg-label">Địa chỉ:</label>
                    <input type="text" name="cg_address" value="<?php echo esc_attr( $address ); ?>" class="cg-input" placeholder="VD: 123 Đường ABC, Cần Giuộc" />
                </div>
                <div class="cg-field">
                    <label class="cg-label">Giờ mở cửa:</label>
                    <input type="text" name="cg_hours" value="<?php echo esc_attr( $hours ); ?>" class="cg-input" placeholder="VD: 07:00 - 22:00" />
                </div>
                <div class="cg-field">
                    <label class="cg-label">Link Google Maps:</label>
                    <input type="text" name="cg_map_link" value="<?php echo esc_attr( $map_link ); ?>" class="cg-input" placeholder="https://maps.google.com/..." />
                </div>
            </div>

            <!-- Khoảng giá -->
            <div class="cg-section">
                <h3 class="cg-section-title"><span>💰</span> Khoảng giá (Chọn 1 mức)</h3>
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

            <!-- Tiện ích & Đặc điểm (CHECKBOX BOOLEAN) -->
            <div class="cg-section">
                <h3 class="cg-section-title"><span>✨</span> Tiện ích & Đặc điểm (Tick các mục phù hợp)</h3>
                <div class="cg-amenities-grid">
                    <?php
                    $amenities = array(
                        'has_ac' => '❄️ Có máy lạnh',
                        'has_parking' => '🛵 Có chỗ giữ xe',
                        'is_verified' => '✅ Đã xác thực',
                        'is_local_choice' => '🏠 Dân địa phương chọn',
                        'is_new' => '🆕 Quán mới',
                        'is_trending' => '🔥 Đang hot (Trending)',
                        'is_family_friendly' => '👨‍👩‍👧‍👦 Phù hợp gia đình',
                        'has_nice_view' => '📸 View đẹp/Sống ảo',
                        'is_good_cheap' => '💰 Ngon, bổ, rẻ',
                        'is_authentic' => '🍜 Chuẩn vị/Authentic',
                        'has_alcohol' => '🍺 Có bán rượu bia',
                        'is_shipping' => '🚀 Giao hàng/Delivery'
                    );
                    
                    foreach ( $amenities as $key => $label ) :
                        $var_name = $key;
                        $is_checked = get_post_meta( $post->ID, '_cg_' . $key, true ) === '1';
                        $checked_class = $is_checked ? 'checked' : '';
                    ?>
                        <div class="cg-amenity-item <?php echo $checked_class; ?>">
                            <label>
                                <input type="checkbox" name="cg_<?php echo $key; ?>" value="1" <?php checked( $is_checked, true ); ?> />
                                <?php echo $label; ?>
                            </label>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Đánh giá -->
            <div class="cg-section">
                <h3 class="cg-section-title"><span>⭐</span> Đánh giá (Thang điểm 1-10)</h3>
                <div class="cg-ratings-grid">
                    <div class="cg-rating-field">
                        <label class="cg-label">🍽️ Chất lượng:</label>
                        <input type="number" name="cg_rating_food" value="<?php echo esc_attr( $rating_food ); ?>" min="0" max="10" step="0.5" />
                    </div>
                    <div class="cg-rating-field">
                        <label class="cg-label">💵 Giá cả:</label>
                        <input type="number" name="cg_rating_price" value="<?php echo esc_attr( $rating_price ); ?>" min="0" max="10" step="0.5" />
                    </div>
                    <div class="cg-rating-field">
                        <label class="cg-label">👨‍🍳 Phục vụ:</label>
                        <input type="number" name="cg_rating_service" value="<?php echo esc_attr( $rating_service ); ?>" min="0" max="10" step="0.5" />
                    </div>
                    <div class="cg-rating-field">
                        <label class="cg-label">🏪 Không gian:</label>
                        <input type="number" name="cg_rating_ambiance" value="<?php echo esc_attr( $rating_ambiance ); ?>" min="0" max="10" step="0.5" />
                    </div>
                </div>
            </div>

        </div>

        <script>
        jQuery(document).ready(function($) {
            // Highlight selected price
            $('input[name="cg_price_range"]').on('change', function() {
                $('.cg-price-option').removeClass('selected');
                $(this).closest('.cg-price-option').addClass('selected');
            });
            
            // Highlight checked amenities
            $('.cg-amenity-item input[type="checkbox"]').on('change', function() {
                if ($(this).is(':checked')) {
                    $(this).closest('.cg-amenity-item').addClass('checked');
                } else {
                    $(this).closest('.cg-amenity-item').removeClass('checked');
                }
            });
        });
        </script>
        <?php
    }

    public function save_custom_meta_data( $post_id ) {
        if ( ! isset( $_POST['cg_meta_nonce'] ) || ! wp_verify_nonce( $_POST['cg_meta_nonce'], 'save_cg_meta' ) ) return;
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
        if ( ! current_user_can( 'edit_post', $post_id ) ) return;

        // Text fields
        $text_fields = array( 'cg_phone', 'cg_address', 'cg_hours', 'cg_map_link', 'cg_rating_food', 'cg_rating_price', 'cg_rating_service', 'cg_rating_ambiance' );
        foreach ( $text_fields as $field ) {
            if ( isset( $_POST[ $field ] ) ) {
                update_post_meta( $post_id, '_' . $field, sanitize_text_field( $_POST[ $field ] ) );
            }
        }

        // Price Range
        if ( isset( $_POST['cg_price_range'] ) ) {
            update_post_meta( $post_id, '_cg_price_range', sanitize_text_field( $_POST['cg_price_range'] ) );
        }

        // Boolean fields (Tiện ích)
        $boolean_fields = array( 
            'cg_has_ac', 'cg_has_parking', 'cg_is_verified', 'cg_is_local_choice', 
            'cg_is_new', 'cg_is_trending', 'cg_is_family_friendly', 'cg_has_nice_view', 
            'cg_is_good_cheap', 'cg_is_authentic', 'cg_has_alcohol', 'cg_is_shipping'
        );
        foreach ( $boolean_fields as $field ) {
            $value = isset( $_POST[ $field ] ) ? '1' : '0';
            update_post_meta( $post_id, '_' . $field, $value );
        }
    }

    /**
     * 4. REST API Fields - TỐI ƯU VỚI thumbnail_url & formatted_price
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

        // Price Range (value)
        register_rest_field( 'quan_an', 'price_range', array(
            'get_callback' => function( $object ) {
                return get_post_meta( $object['id'], '_cg_price_range', true );
            },
            'schema' => array( 'type' => 'string' ),
        ));

        // Formatted Price (label hiển thị)
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

        // Boolean fields (Tiện ích)
        $boolean_fields = array( 
            'has_ac', 'has_parking', 'is_verified', 'is_local_choice', 
            'is_new', 'is_trending', 'is_family_friendly', 'has_nice_view', 
            'is_good_cheap', 'is_authentic', 'has_alcohol', 'is_shipping'
        );
        foreach ( $boolean_fields as $field ) {
            register_rest_field( 'quan_an', $field, array(
                'get_callback' => function( $object ) use ( $field ) {
                    $value = get_post_meta( $object['id'], '_cg_' . $field, true );
                    return $value === '1';
                },
                'schema' => array( 'type' => 'boolean' ),
            ));
        }

        // VIRTUAL BADGES ARRAY (Để tương thích với Frontend)
        register_rest_field( 'quan_an', 'badges', array(
            'get_callback' => function( $object ) use ( $boolean_fields ) {
                $badges = array();
                foreach ( $boolean_fields as $field ) {
                    if ( get_post_meta( $object['id'], '_cg_' . $field, true ) === '1' ) {
                        // Chuyển is_verified -> verified để khớp với frontend
                        $key = str_replace( array('is_', 'has_'), '', $field );
                        $badges[] = $key;
                        // Giữ cả key gốc cho chắc chắn
                        $badges[] = $field;
                    }
                }
                return array_unique($badges);
            },
            'schema' => array( 'type' => 'array' ),
        ));

        // FOOD TYPE SLUGS (Để lọc theo danh mục)
        register_rest_field( 'quan_an', 'food_type_slugs', array(
            'get_callback' => function( $object ) {
                $terms = wp_get_post_terms( $object['id'], 'food_type' );
                return is_wp_error( $terms ) ? array() : wp_list_pluck( $terms, 'slug' );
            },
            'schema' => array( 'type' => 'array' ),
        ));

        // KHU VUC SLUGS
        register_rest_field( 'quan_an', 'khu_vuc_slugs', array(
            'get_callback' => function( $object ) {
                $terms = wp_get_post_terms( $object['id'], 'khu_vuc' );
                return is_wp_error( $terms ) ? array() : wp_list_pluck( $terms, 'slug' );
            },
            'schema' => array( 'type' => 'array' ),
        ));

        // Thumbnail URL (TRỰC TIẾP - Không cần _embed)
        register_rest_field( 'quan_an', 'thumbnail_url', array(
            'get_callback' => function( $object ) {
                $image_id = get_post_thumbnail_id( $object['id'] );
                if ( $image_id ) {
                    $image_url = wp_get_attachment_image_url( $image_id, 'medium' );
                    return $image_url ?: null;
                }
                return null;
            },
            'schema' => array( 'type' => 'string' ),
        ));

        // Featured Media URL (Large - cho trang chi tiết)
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

        // Average Rating (Tính sẵn)
        register_rest_field( 'quan_an', 'average_rating', array(
            'get_callback' => function( $object ) {
                $ratings = array(
                    floatval( get_post_meta( $object['id'], '_cg_rating_food', true ) ),
                    floatval( get_post_meta( $object['id'], '_cg_rating_price', true ) ),
                    floatval( get_post_meta( $object['id'], '_cg_rating_service', true ) ),
                    floatval( get_post_meta( $object['id'], '_cg_rating_ambiance', true ) ),
                );
                $ratings = array_filter( $ratings );
                if ( count( $ratings ) > 0 ) {
                    return round( array_sum( $ratings ) / count( $ratings ), 1 );
                }
                return null;
            },
            'schema' => array( 'type' => 'number' ),
        ));
    }

    /**
     * 5. Custom REST Query - Search & Sort
     */
    public function custom_rest_query( $args, $request ) {
        if ( ! empty( $request['search'] ) ) {
            $args['s'] = sanitize_text_field( $request['search'] );
        }

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
        
        // --- LƯU VÀO DATABASE ---
        $post_title = ($type === 'owner' ? '[Đăng ký] ' : '[Review] ') . $store_name;
        $submission_id = wp_insert_post( array(
            'post_title'   => $post_title,
            'post_type'    => 'cg_submission',
            'post_status'  => 'publish',
            'meta_input'   => array(
                '_sub_type'           => $type,
                '_sub_store_name'     => $store_name,
                '_sub_address'        => $address,
                '_sub_message'        => $message,
                '_sub_phone'          => isset($params['phone']) ? sanitize_text_field($params['phone']) : '',
                '_sub_recommend_food' => isset($params['recommend_food']) ? sanitize_text_field($params['recommend_food']) : '',
            ),
        ));

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
        $body .= "\nXem chi tiết trong Admin: " . admin_url('post.php?post=' . $submission_id . '&action=edit');

        $admin_email = get_option( 'admin_email' );
        wp_mail( $admin_email, $subject, $body );
        
        return new WP_REST_Response( array( 
            'success' => true, 
            'message' => 'Đã nhận thông tin và lưu vào hệ thống'
        ), 200 );
    }

    /**
     * 7. IMPORT DATA FEATURE
     */
    public function register_import_menu() {
        add_submenu_page(
            'edit.php?post_type=quan_an',
            'Nhập dữ liệu (Import)',
            'Nhập dữ liệu',
            'manage_options',
            'import-quan-an',
            array( $this, 'render_import_page' )
        );
    }

    public function render_import_page() {
        $message = '';
        if ( isset( $_POST['cg_import_submit'] ) && check_admin_referer( 'cg_import_action', 'cg_import_nonce' ) ) {
            $message = $this->handle_csv_import();
        }
        ?>
        <div class="wrap">
            <h1>📥 Nhập dữ liệu Quán ăn từ CSV (Header Mapping)</h1>
            <?php echo $message; ?>
            <div class="card" style="max-width: 600px; padding: 20px; margin-top: 20px;">
                <p><strong>Hướng dẫn chuẩn:</strong></p>
                <ul style="margin-left: 20px; list-style: disc;">
                    <li>File CSV <strong>BẮT BUỘC</strong> phải có dòng đầu tiên là tiêu đề cột (Header).</li>
                    <li>Cột bắt buộc phải có: <code>Name</code></li>
                    <li>Các cột tùy chọn: <code>Address</code>, <code>Rating</code>, <code>Image</code>, <code>MapLink</code></li>
                    <li>Thứ tự cột không quan trọng, hệ thống sẽ tự tìm dựa trên tên cột.</li>
                </ul>
                <form method="post" enctype="multipart/form-data">
                    <?php wp_nonce_field( 'cg_import_action', 'cg_import_nonce' ); ?>
                    <p>
                        <label>Chọn file CSV:</label><br>
                        <input type="file" name="csv_file" accept=".csv" required />
                    </p>
                    <p>
                        <input type="submit" name="cg_import_submit" class="button button-primary" value="Bắt đầu Import" />
                    </p>
                </form>
            </div>
        </div>
        <?php
    }

    private function handle_csv_import() {
        if ( ! isset( $_FILES['csv_file'] ) || $_FILES['csv_file']['error'] !== 0 ) {
            return '<div class="notice notice-error"><p>Lỗi upload file.</p></div>';
        }

        $file_handle = fopen( $_FILES['csv_file']['tmp_name'], 'r' );
        if ( ! $file_handle ) {
            return '<div class="notice notice-error"><p>Không thể mở file.</p></div>';
        }

        // 1. Đọc Header để xác định mapping
        $headers = fgetcsv( $file_handle );
        if ( ! $headers ) {
            fclose( $file_handle );
            return '<div class="notice notice-error"><p>File CSV rỗng hoặc lỗi format.</p></div>';
        }

        // Chuẩn hóa header: trim space, bỏ BOM header nếu có
        $headers = array_map( 'trim', $headers );
        
        // Remove BOM from first item if exists
        $headers[0] = preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $headers[0]);

        // Tìm index các cột
        $idx_name     = array_search( 'Name', $headers );
        $idx_address  = array_search( 'Address', $headers );
        $idx_rating   = array_search( 'Rating', $headers );
        $idx_image    = array_search( 'Image', $headers );
        $idx_map      = array_search( 'MapLink', $headers );

        // Validate cột bắt buộc
        if ( $idx_name === false ) {
            fclose( $file_handle );
            return '<div class="notice notice-error"><p>Lỗi: Không tìm thấy cột <strong>Name</strong> trong file CSV. Vui lòng kiểm tra dòng tiêu đề.</p></div>';
        }

        $count_success = 0;
        $count_skip = 0;
        $count_error = 0;

        while ( ( $row = fgetcsv( $file_handle ) ) !== false ) {
            // Lấy dữ liệu dựa trên index tìm được
            $name = isset($row[$idx_name]) ? sanitize_text_field( $row[$idx_name] ) : '';
            
            if ( empty( $name ) ) {
                $count_skip++;
                continue;
            }

            // Kiểm tra trùng tên
            if ( $this->post_exists_by_title( $name ) ) {
                $count_skip++;
                continue;
            }

            // Lấy các field khác
            $address    = ($idx_address !== false && isset($row[$idx_address])) ? sanitize_text_field( $row[$idx_address] ) : '';
            $rating_raw = ($idx_rating !== false && isset($row[$idx_rating])) ? $row[$idx_rating] : '0';
            $image_url  = ($idx_image !== false && isset($row[$idx_image])) ? esc_url_raw( $row[$idx_image] ) : '';
            $map_link   = ($idx_map !== false && isset($row[$idx_map])) ? esc_url_raw( $row[$idx_map] ) : '';

            // Tạo Post
            $post_id = wp_insert_post( array(
                'post_title'   => $name,
                'post_type'    => 'quan_an',
                'post_status'  => 'publish',
                'meta_input'   => array(
                    '_cg_address'      => $address,
                    '_cg_map_link'     => $map_link, 
                    '_cg_rating_food'  => str_replace( ',', '.', $rating_raw ),
                ),
            ));

            if ( is_wp_error( $post_id ) ) {
                $count_error++;
                continue;
            }

            // Taxonomy: Chưa phân loại
            if ( ! term_exists( 'Chưa phân loại', 'food_type' ) ) {
                wp_insert_term( 'Chưa phân loại', 'food_type' );
            }
            wp_set_object_terms( $post_id, 'Chưa phân loại', 'food_type' );

            // Taxonomy: Khu vực (Auto-detect from Address)
            if ( ! empty( $address ) ) {
                $this->auto_assign_region( $post_id, $address );
            }

            // Image Sideload
            if ( ! empty( $image_url ) ) {
                $this->sideload_image( $image_url, $post_id );
            }

            $count_success++;
        }

        fclose( $file_handle );

        return '<div class="notice notice-success"><p>Đã nhập thành công: <strong>' . $count_success . '</strong> quán. Bỏ qua (trùng/rỗng): ' . $count_skip . '. Lỗi: ' . $count_error . '.</p></div>';
    }

    private function post_exists_by_title( $title ) {
        $post = get_page_by_title( $title, OBJECT, 'quan_an' );
        return $post ? true : false;
    }

    private function auto_assign_region( $post_id, $address ) {
        $regions = array(
            'Thị trấn Cần Giuộc' => 'Thị trấn Cần Giuộc',
            'Cần Giuộc'          => 'Thị trấn Cần Giuộc', // Mapping keyword
            'Phước Lý'           => 'Xã Phước Lý',
            'Mỹ Lộc'             => 'Xã Mỹ Lộc',
            'Phước Vĩnh Tây'     => 'Xã Phước Vĩnh Tây',
            'Tân Tập'            => 'Xã Tân Tập'
        );

        foreach ( $regions as $keyword => $term_name ) {
            if ( stripos( $address, $keyword ) !== false ) {
                // Đảm bảo term tồn tại trước khi gán
                if ( ! term_exists( $term_name, 'khu_vuc' ) ) {
                    wp_insert_term( $term_name, 'khu_vuc' );
                }
                wp_set_object_terms( $post_id, $term_name, 'khu_vuc' );
                break; // Tìm thấy 1 khu vực là đủ
            }
        }
    }

    private function sideload_image( $url, $post_id ) {
        require_once( ABSPATH . 'wp-admin/includes/media.php' );
        require_once( ABSPATH . 'wp-admin/includes/file.php' );
        require_once( ABSPATH . 'wp-admin/includes/image.php' );

        // Tải ảnh về
        $tmp = download_url( $url );
        if ( is_wp_error( $tmp ) ) return;

        $file_array = array(
            'name'     => basename( $url ),
            'tmp_name' => $tmp,
        );

        // Check file extension
        $file_type = wp_check_filetype( $file_array['name'], null );
        if ( ! $file_type['type'] ) {
            $file_array['name'] .= '.jpg'; // Fallback extension
        }

        $id = media_handle_sideload( $file_array, $post_id );

        if ( ! is_wp_error( $id ) ) {
            set_post_thumbnail( $post_id, $id );
        }

        @unlink( $file_array['tmp_name'] ); // Clean up
    }
}

new Can_Giuoc_Food_Core();
