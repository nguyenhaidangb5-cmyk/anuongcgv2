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
        
        // --- 8. STICKY POST SUPPORT ---
        add_action( 'add_meta_boxes', array( $this, 'add_sticky_support_to_cpt' ) );
        
        // --- 9. MEDIA UPLOADER SCRIPT ---
        add_action( 'admin_footer', array( $this, 'enqueue_media_uploader_script' ) );
        
        // --- 10. ENTERPRISE FEATURES ---
        add_action( 'init', array( $this, 'register_custom_post_status' ) );
        add_action( 'add_meta_boxes', array( $this, 'add_top5_scheduling_meta_box' ) );
        add_action( 'save_post', array( $this, 'save_top5_scheduling_data' ) );
        add_action( 'rest_api_init', array( $this, 'register_tracking_endpoint' ) );
        add_action( 'rest_api_init', array( $this, 'register_top5_rest_fields' ) );
        
        // --- 11. SMART CONTRIBUTION ---
        add_action( 'init', array( $this, 'register_cpt_bao_cao' ) );
        add_action( 'add_meta_boxes', array( $this, 'add_report_processing_meta_box' ) );
        add_action( 'save_post', array( $this, 'save_report_meta_data' ) );
        add_action( 'wp_ajax_approve_and_merge', array( $this, 'handle_approve_and_merge' ) );
        add_action( 'admin_footer', array( $this, 'enqueue_report_processing_script' ) );
        add_action( 'rest_api_init', array( $this, 'register_report_submission_endpoint' ) );
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
        
        // Meta Box: Ảnh Thực Đơn
        add_meta_box(
            'menu_images_meta_box',
            '🍽️ Ảnh Thực Đơn',
            array( $this, 'render_menu_images_meta_box' ),
            'quan_an',
            'normal',
            'default'
        );
        
        // Meta Box: Ảnh Không Gian Quán
        add_meta_box(
            'gallery_images_meta_box',
            '📸 Ảnh Không Gian Quán',
            array( $this, 'render_gallery_images_meta_box' ),
            'quan_an',
            'normal',
            'default'
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

    /**
     * Render Meta Box: Ảnh Thực Đơn
     */
    public function render_menu_images_meta_box( $post ) {
        $menu_images = get_post_meta( $post->ID, '_cg_menu_images', true );
        $menu_images = $menu_images ? $menu_images : array();
        wp_nonce_field( 'save_menu_images', 'menu_images_nonce' );
        ?>
        <div class="cg-image-uploader">
            <p class="description">Tải lên ảnh thực đơn của quán (giá tiền, món ăn). Khách hàng có thể zoom để xem rõ giá.</p>
            <div class="cg-images-container" id="menu-images-container">
                <?php
                if ( ! empty( $menu_images ) && is_array( $menu_images ) ) {
                    foreach ( $menu_images as $image_id ) {
                        $image_url = wp_get_attachment_image_url( $image_id, 'thumbnail' );
                        if ( $image_url ) {
                            echo '<div class="cg-image-item" data-id="' . esc_attr( $image_id ) . '">';
                            echo '<img src="' . esc_url( $image_url ) . '" />';
                            echo '<button type="button" class="cg-remove-image">✕</button>';
                            echo '<input type="hidden" name="cg_menu_images[]" value="' . esc_attr( $image_id ) . '" />';
                            echo '</div>';
                        }
                    }
                }
                ?>
            </div>
            <button type="button" class="button button-primary cg-add-images" data-target="menu">
                ➕ Thêm ảnh thực đơn
            </button>
        </div>
        <style>
            .cg-image-uploader { padding: 10px 0; }
            .cg-images-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin: 15px 0; }
            .cg-image-item { position: relative; border: 2px solid #ddd; border-radius: 8px; overflow: hidden; aspect-ratio: 1; }
            .cg-image-item img { width: 100%; height: 100%; object-fit: cover; }
            .cg-remove-image { position: absolute; top: 5px; right: 5px; background: #dc3232; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 14px; line-height: 1; }
            .cg-remove-image:hover { background: #a00; }
        </style>
        <?php
    }

    /**
     * Render Meta Box: Ảnh Không Gian Quán
     */
    public function render_gallery_images_meta_box( $post ) {
        $gallery_images = get_post_meta( $post->ID, '_cg_gallery_images', true );
        $gallery_images = $gallery_images ? $gallery_images : array();
        wp_nonce_field( 'save_gallery_images', 'gallery_images_nonce' );
        ?>
        <div class="cg-image-uploader">
            <p class="description">Tải lên ảnh không gian quán (bàn ghế, trang trí, view đẹp). Giúp khách hàng hình dung trước khi đến.</p>
            <div class="cg-images-container" id="gallery-images-container">
                <?php
                if ( ! empty( $gallery_images ) && is_array( $gallery_images ) ) {
                    foreach ( $gallery_images as $image_id ) {
                        $image_url = wp_get_attachment_image_url( $image_id, 'thumbnail' );
                        if ( $image_url ) {
                            echo '<div class="cg-image-item" data-id="' . esc_attr( $image_id ) . '">';
                            echo '<img src="' . esc_url( $image_url ) . '" />';
                            echo '<button type="button" class="cg-remove-image">✕</button>';
                            echo '<input type="hidden" name="cg_gallery_images[]" value="' . esc_attr( $image_id ) . '" />';
                            echo '</div>';
                        }
                    }
                }
                ?>
            </div>
            <button type="button" class="button button-primary cg-add-images" data-target="gallery">
                ➕ Thêm ảnh không gian
            </button>
        </div>
        <?php
    }

    /**
     * Enqueue Media Uploader Script
     */
    public function enqueue_media_uploader_script() {
        global $post_type;
        if ( 'quan_an' === $post_type ) {
            wp_enqueue_media();
            ?>
            <script>
            jQuery(document).ready(function($) {
                // Xử lý nút "Thêm ảnh"
                $('.cg-add-images').on('click', function(e) {
                    e.preventDefault();
                    var target = $(this).data('target');
                    var container = $('#' + target + '-images-container');
                    var fieldName = 'cg_' + target + '_images[]';
                    
                    var frame = wp.media({
                        title: 'Chọn ảnh',
                        button: { text: 'Sử dụng ảnh này' },
                        multiple: true
                    });
                    
                    frame.on('select', function() {
                        var attachments = frame.state().get('selection').toJSON();
                        attachments.forEach(function(attachment) {
                            var imageHtml = '<div class="cg-image-item" data-id="' + attachment.id + '">' +
                                '<img src="' + attachment.sizes.thumbnail.url + '" />' +
                                '<button type="button" class="cg-remove-image">✕</button>' +
                                '<input type="hidden" name="' + fieldName + '" value="' + attachment.id + '" />' +
                                '</div>';
                            container.append(imageHtml);
                        });
                    });
                    
                    frame.open();
                });
                
                // Xử lý nút "Xóa ảnh"
                $(document).on('click', '.cg-remove-image', function(e) {
                    e.preventDefault();
                    $(this).closest('.cg-image-item').fadeOut(300, function() {
                        $(this).remove();
                    });
                });
            });
            </script>
            <?php
        }
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

        // --- LƯU ẢNH THỰC ĐƠN ---
        if ( isset( $_POST['menu_images_nonce'] ) && wp_verify_nonce( $_POST['menu_images_nonce'], 'save_menu_images' ) ) {
            $menu_images = isset( $_POST['cg_menu_images'] ) && is_array( $_POST['cg_menu_images'] ) 
                ? array_map( 'intval', $_POST['cg_menu_images'] ) 
                : array();
            update_post_meta( $post_id, '_cg_menu_images', $menu_images );
        }

        // --- LƯU ẢNH KHÔNG GIAN QUÁN ---
        if ( isset( $_POST['gallery_images_nonce'] ) && wp_verify_nonce( $_POST['gallery_images_nonce'], 'save_gallery_images' ) ) {
            $gallery_images = isset( $_POST['cg_gallery_images'] ) && is_array( $_POST['cg_gallery_images'] ) 
                ? array_map( 'intval', $_POST['cg_gallery_images'] ) 
                : array();
            update_post_meta( $post_id, '_cg_gallery_images', $gallery_images );
        }

        // --- XỬ LÝ STICKY POST ---
        if ( isset( $_POST['sticky'] ) ) {
            stick_post( $post_id );
        } else {
            unstick_post( $post_id );
        }
    }

    /**
     * 4. REST API Fields - TỐI ƯU VỚI thumbnail_url & formatted_price
     */
    public function register_rest_fields() {
        // Sticky status
        register_rest_field( 'quan_an', 'sticky', array(
            'get_callback' => function( $object ) {
                return is_sticky( $object['id'] );
            },
            'update_callback' => function( $value, $post ) {
                if ( $value ) {
                    stick_post( $post->ID );
                } else {
                    unstick_post( $post->ID );
                }
                return true;
            },
            'schema' => array( 'type' => 'boolean' ),
        ));

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

        // Thumbnail URL (Large - hiển thị danh sách rõ nét hơn)
        register_rest_field( 'quan_an', 'thumbnail_url', array(
            'get_callback' => function( $object ) {
                $image_id = get_post_thumbnail_id( $object['id'] );
                if ( $image_id ) {
                    // Chuyển từ 'medium' sang 'large' để ảnh nét hơn
                    $image_url = wp_get_attachment_image_url( $image_id, 'large' );
                    return $image_url ?: null;
                }
                return null;
            },
            'schema' => array( 'type' => 'string' ),
        ));

        // Featured Media URL (Full - cho trang chi tiết sắc nét nhất)
        register_rest_field( 'quan_an', 'featured_media_url', array(
            'get_callback' => function( $object ) {
                $image_id = $object['featured_media'];
                if ( $image_id ) {
                    // Chuyển từ 'large' sang 'full' để lấy ảnh gốc chất lượng cao nhất
                    return wp_get_attachment_image_url( $image_id, 'full' );
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

        // --- MENU IMAGES ---
        register_rest_field( 'quan_an', 'menu_images', array(
            'get_callback' => function( $object ) {
                $image_ids = get_post_meta( $object['id'], '_cg_menu_images', true );
                if ( empty( $image_ids ) || ! is_array( $image_ids ) ) {
                    return array();
                }
                
                $images = array();
                foreach ( $image_ids as $image_id ) {
                    $image_data = wp_get_attachment_image_src( $image_id, 'full' );
                    if ( $image_data ) {
                        $images[] = array(
                            'sourceUrl' => $image_data[0],
                            'altText' => get_post_meta( $image_id, '_wp_attachment_image_alt', true ) ?: '',
                            'width' => $image_data[1],
                            'height' => $image_data[2],
                        );
                    }
                }
                return $images;
            },
            'schema' => array(
                'type' => 'array',
                'items' => array(
                    'type' => 'object',
                    'properties' => array(
                        'sourceUrl' => array( 'type' => 'string' ),
                        'altText' => array( 'type' => 'string' ),
                        'width' => array( 'type' => 'integer' ),
                        'height' => array( 'type' => 'integer' ),
                    ),
                ),
            ),
        ));

        // --- GALLERY IMAGES ---
        register_rest_field( 'quan_an', 'gallery_images', array(
            'get_callback' => function( $object ) {
                $image_ids = get_post_meta( $object['id'], '_cg_gallery_images', true );
                if ( empty( $image_ids ) || ! is_array( $image_ids ) ) {
                    return array();
                }
                
                $images = array();
                foreach ( $image_ids as $image_id ) {
                    $image_data = wp_get_attachment_image_src( $image_id, 'full' );
                    if ( $image_data ) {
                        $images[] = array(
                            'sourceUrl' => $image_data[0],
                            'altText' => get_post_meta( $image_id, '_wp_attachment_image_alt', true ) ?: '',
                            'width' => $image_data[1],
                            'height' => $image_data[2],
                        );
                    }
                }
                return $images;
            },
            'schema' => array(
                'type' => 'array',
                'items' => array(
                    'type' => 'object',
                    'properties' => array(
                        'sourceUrl' => array( 'type' => 'string' ),
                        'altText' => array( 'type' => 'string' ),
                        'width' => array( 'type' => 'integer' ),
                        'height' => array( 'type' => 'integer' ),
                    ),
                ),
            ),
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
        
        // Handle "sticky=true" parameter for CPT
        if ( isset( $request['sticky'] ) && $request['sticky'] === 'true' ) {
            $sticky_posts = get_option( 'sticky_posts' );
            if ( empty( $sticky_posts ) ) {
                // Return no results if no sticky posts
                $args['post__in'] = array( 0 );
            } else {
                $args['post__in'] = $sticky_posts;
                $args['ignore_sticky_posts'] = true; // Avoid double handling
            }
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

        // Submenu: Bảo trì & Dọn dẹp
        add_submenu_page( 
            'edit.php?post_type=quan_an', 
            'Bảo trì', 
            'Bảo trì & Dọn dẹp', 
            'manage_options', 
            'cg-food-maintenance', 
            array( $this, 'render_maintenance_page' ) 
        );
    }

    /**
     * Render trang bảo trì
     */
    public function render_maintenance_page() {
        if ( ! current_user_can( 'manage_options' ) ) return;

        // Xử lý hành động dọn dẹp
        $message = '';
        if ( isset( $_POST['cg_cleanup_action'] ) && check_admin_referer( 'cg_cleanup_action', 'cg_cleanup_nonce' ) ) {
            $count = $this->cleanup_orphaned_images();
            $message = '<div class="notice notice-success"><p>Đã dọn dẹp thành công: <strong>' . $count . '</strong> hình ảnh rác (không gắn với quán nào).</p></div>';
        }

        ?>
        <div class="wrap">
            <h1>🛠️ Bảo trì & Dọn dẹp hệ thống</h1>
            <?php echo $message; ?>
            
            <div class="card" style="max-width: 600px; margin-top: 20px; padding: 20px;">
                <h2>🧹 Dọn dẹp ảnh rác</h2>
                <p>Chức năng này sẽ quét và xóa các hình ảnh được import tự động trước đây nhưng hiện tại không còn gắn với quán ăn nào (do quán đã bị xóa hoặc import lỗi).</p>
                <p>Nên chạy chức năng này sau khi xóa bỏ các quán cũ để tiết kiệm dung lượng hosting.</p>
                
                <form method="post">
                    <?php wp_nonce_field( 'cg_cleanup_action', 'cg_cleanup_nonce' ); ?>
                    <p>
                        <input type="submit" name="cg_cleanup_action" class="button button-primary button-large" value="Quét & Xóa ảnh rác ngay" onclick="return confirm('Bạn có chắc chắn muốn xóa vĩnh viễn các ảnh không sử dụng?');" />
                    </p>
                </form>
            </div>
        </div>
        <?php
    }

    /**
     * Logic dọn dẹp ảnh rác
     */
    private function cleanup_orphaned_images() {
        global $wpdb;
        
        // 1. Tìm tất cả attachment có tên bắt đầu bằng "restaurant-" (dấu hiệu của tool này)
        // và post_parent > 0
        $attachments = $wpdb->get_results( "
            SELECT ID, post_parent 
            FROM {$wpdb->posts} 
            WHERE post_type = 'attachment' 
            AND post_name LIKE 'restaurant-%'
            AND post_parent > 0
        " );

        $count_deleted = 0;

        foreach ( $attachments as $att ) {
            // 2. Kiểm tra xem post_parent (quán ăn) còn tồn tại không
            $parent = get_post( $att->post_parent );
            
            // Nếu cha không còn tồn tại, hoặc cha đang ở thùng rác -> Xóa ảnh
            if ( ! $parent || $parent->post_status === 'trash' ) {
                if ( wp_delete_attachment( $att->ID, true ) ) {
                    $count_deleted++;
                }
            }
        }

        return $count_deleted;
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

        // Đảm bảo category "Gợi ý từ Google" tồn tại
        $this->ensure_google_suggestion_category();

        $count_total = 0;
        $count_success = 0;
        $count_duplicate = 0;
        $count_empty = 0;
        $count_error = 0;

        while ( ( $row = fgetcsv( $file_handle ) ) !== false ) {
            $count_total++;
            
            // Lấy dữ liệu dựa trên index tìm được
            $name = isset($row[$idx_name]) ? sanitize_text_field( $row[$idx_name] ) : '';
            
            if ( empty( $name ) ) {
                $count_empty++;
                continue;
            }

            // Lấy các field khác
            $address    = ($idx_address !== false && isset($row[$idx_address])) ? sanitize_text_field( $row[$idx_address] ) : '';
            $rating_raw = ($idx_rating !== false && isset($row[$idx_rating])) ? $row[$idx_rating] : '0';
            $image_url_raw  = ($idx_image !== false && isset($row[$idx_image])) ? $row[$idx_image] : '';
            $map_link   = ($idx_map !== false && isset($row[$idx_map])) ? esc_url_raw( $row[$idx_map] ) : '';

            // AUTO-CLEAN IMAGE URL - Loại bỏ tham số kích thước để lấy ảnh gốc chất lượng cao
            $image_url = $this->clean_image_url( $image_url_raw );

            // SMART DEDUPLICATION - Ưu tiên MapLink, sau đó mới đến Title
            // 1. Kiểm tra trùng theo MapLink (ưu tiên cao nhất)
            if ( ! empty( $map_link ) && $this->post_exists_by_map_link( $map_link ) ) {
                $count_duplicate++;
                continue;
            }
            
            // 2. Kiểm tra trùng theo Title
            if ( $this->post_exists_by_title( $name ) ) {
                $count_duplicate++;
                continue;
            }

            // CONTENT INJECTION - Tạo nội dung với disclaimer và action buttons
            $post_content = $this->generate_post_content_with_disclaimer( $name );

            // Tạo Post
            $post_id = wp_insert_post( array(
                'post_title'   => $name,
                'post_type'    => 'quan_an',
                'post_status'  => 'publish',
                'post_content' => $post_content,
                'meta_input'   => array(
                    '_cg_address'      => $address,
                    '_cg_map_link'     => $map_link, 
                    '_cg_rating_food'  => str_replace( ',', '.', $rating_raw ),
                ),
            ));

            if ( $post_id && ! is_wp_error( $post_id ) ) {
                $count_success++;
                
                // Taxonomy: "Gợi ý từ Google"
                wp_set_object_terms( $post_id, 'Gợi ý từ Google', 'food_type' );

                // Taxonomy: Khu vực (Auto-detect from Address)
                if ( ! empty( $address ) ) {
                    $this->auto_assign_region( $post_id, $address );
                }

                // Image Sideload (với URL đã được clean)
                if ( ! empty( $image_url ) ) {
                    $this->sideload_image( $image_url, $post_id );
                }
            } else {
                $count_error++;
            }
        }
        
        fclose( $file_handle );

        // Báo cáo chi tiết
        $message = '<div class="notice notice-success"><p><strong>📊 Kết quả Import (Smart Mode):</strong></p>';
        $message .= '<ul style="margin-left: 20px; list-style: disc;">';
        $message .= '<li>Tổng số dòng trong CSV: <strong>' . $count_total . '</strong></li>';
        $message .= '<li>✅ Đã thêm mới: <strong style="color: green;">' . $count_success . '</strong></li>';
        $message .= '<li>⏭️ Đã bỏ qua (Trùng lặp): <strong style="color: orange;">' . $count_duplicate . '</strong></li>';
        $message .= '<li>⚠️ Dòng rỗng: <strong>' . $count_empty . '</strong></li>';
        $message .= '<li>❌ Lỗi: <strong style="color: red;">' . $count_error . '</strong></li>';
        $message .= '</ul>';
        $message .= '<p style="margin-top: 10px;"><em>💡 Tất cả bài viết đã được phân loại vào "Gợi ý từ Google" và có disclaimer tự động.</em></p>';
        $message .= '</div>';
        
        return $message;
    }

    /**
     * AUTO-CLEAN IMAGE URL
     * Loại bỏ các tham số kích thước (=w400, =s120, etc.) để lấy ảnh gốc chất lượng cao
     */
    private function clean_image_url( $url ) {
        if ( empty( $url ) ) {
            return '';
        }
        
        // Loại bỏ các pattern như: =w400-h300, =s120-c, =w1200, etc.
        // Chỉ xóa phần size parameter ở cuối URL
        $cleaned = preg_replace( '/=w\d+(-h\d+)?(-[a-z])?$/i', '', $url );
        $cleaned = preg_replace( '/=s\d+(-[a-z])?$/i', '', $cleaned );
        
        return esc_url_raw( trim( $cleaned ) );
    }

    /**
     * CONTENT INJECTION
     * Tạo nội dung với disclaimer và action buttons
     */
    private function generate_post_content_with_disclaimer( $restaurant_name ) {
        $safe_name = esc_html( $restaurant_name );
        $encoded_name = rawurlencode( $restaurant_name );
        
        $content = '<p>Thông tin về quán ăn này được tự động thu thập từ Google Maps.</p>';
        $content .= "\n\n";
        $content .= '<hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">';
        $content .= '<div style="background: #f9f9f9; padding: 15px; border-radius: 8px; font-size: 0.9em;">';
        $content .= '<p style="margin-top: 0;"><em>⚠️ <strong>Lưu ý:</strong> Thông tin và hình ảnh được tham khảo tự động từ Google Maps. Vui lòng liên hệ quán để xác nhận trước khi đến.</em></p>';
        $content .= '<div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">';
        $content .= '<a href="mailto:admin@anuongcangiuoc.org?subject=Báo lỗi thông tin quán: ' . $encoded_name . '" ';
        $content .= 'style="background: #ffebee; color: #c62828; padding: 8px 12px; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #ffcdd2;">';
        $content .= '🚨 Báo lỗi / Cập nhật';
        $content .= '</a>';
        $content .= '<a href="mailto:admin@anuongcangiuoc.org?subject=Xác nhận chủ quán: ' . $encoded_name . '" ';
        $content .= 'style="background: #e8f5e9; color: #2e7d32; padding: 8px 12px; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #c8e6c9;">';
        $content .= '✅ Tôi là chủ quán này';
        $content .= '</a>';
        $content .= '</div>';
        $content .= '</div>';
        
        return $content;
    }

    /**
     * Đảm bảo category "Gợi ý từ Google" tồn tại
     */
    private function ensure_google_suggestion_category() {
        if ( ! term_exists( 'Gợi ý từ Google', 'food_type' ) ) {
            wp_insert_term( 'Gợi ý từ Google', 'food_type', array(
                'description' => 'Các quán ăn được gợi ý tự động từ Google Maps',
                'slug'        => 'goi-y-tu-google'
            ));
        }
    }

    private function post_exists_by_title( $title ) {
        $post = get_page_by_title( $title, OBJECT, 'quan_an' );
        return $post ? true : false;
    }

    /**
     * Kiểm tra xem đã có quán nào với map_link này chưa
     */
    private function post_exists_by_map_link( $map_link ) {
        if ( empty( $map_link ) ) {
            return false;
        }
        
        $args = array(
            'post_type'      => 'quan_an',
            'posts_per_page' => 1,
            'meta_query'     => array(
                array(
                    'key'     => '_cg_map_link',
                    'value'   => $map_link,
                    'compare' => '='
                )
            ),
            'fields'         => 'ids'
        );
        
        $query = new WP_Query( $args );
        return $query->have_posts();
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
        if ( empty( $url ) ) {
            return;
        }
        
        require_once( ABSPATH . 'wp-admin/includes/file.php' );
        require_once( ABSPATH . 'wp-admin/includes/media.php' );
        require_once( ABSPATH . 'wp-admin/includes/image.php' );

        // Tải ảnh về
        $tmp = download_url( $url );
        if ( is_wp_error( $tmp ) ) {
            // Log error but don't stop import
            error_log( 'Failed to download image: ' . $url . ' - ' . $tmp->get_error_message() );
            return;
        }

        // Tạo tên file an toàn
        $filename = 'restaurant-' . $post_id . '-' . time() . '.jpg';
        
        // SMART COMPRESSION & RESIZE
        // Xử lý resize và nén thủ công trước khi đưa vào WordPress Media
        // Giúp tiết kiệm dung lượng hosting (chỉ giữ file tối ưu, không giữ file gốc nặng)
        $image_editor = wp_get_image_editor( $tmp );
        
        if ( ! is_wp_error( $image_editor ) ) {
            $size = $image_editor->get_size();
            
            // 1. Resize nếu chiều rộng lớn hơn 2048px
            if ( $size['width'] > 2048 ) {
                $image_editor->resize( 2048, null, false ); // Giữ tỉ lệ, không crop
            }
            
            // 2. Set quality 85 (Smart Compression)
            $image_editor->set_quality( 85 );
            
            // 3. Lưu đè lại file tạm
            $image_editor->save( $tmp );
        }

        $file_array = array(
            'name'     => $filename,
            'tmp_name' => $tmp,
        );

        $id = media_handle_sideload( $file_array, $post_id );

        if ( ! is_wp_error( $id ) ) {
            set_post_thumbnail( $post_id, $id );
        } else {
            error_log( 'Failed to sideload image for post ' . $post_id . ': ' . $id->get_error_message() );
        }

        // Clean up temp file
        if ( file_exists( $tmp ) ) {
            @unlink( $tmp );
        }
    }
    /**
     * 8. HỖ TRỢ Sticky Post cho Custom Post Type "quan_an"
     * Hiển thị checkbox "Stick to the top of the blog" trong Gutenberg
     */
    public function add_sticky_support_to_cpt() {
        global $post_type;
        if ( 'quan_an' !== $post_type ) {
            return;
        }
        
        add_meta_box(
            'quan_an_sticky_meta',
            'Stick to the top of the blog (Ghim bài viết)',
            array( $this, 'render_sticky_meta_box' ),
            'quan_an',
            'side',
            'high'
        );
    }

    public function render_sticky_meta_box( $post ) {
        $is_sticky = is_sticky( $post->ID );
        ?>
        <label>
            <input type="checkbox" name="sticky" value="sticky" <?php checked( $is_sticky ); ?> />
            Stick to the top of the blog (Ghim lên đầu trang)
        </label>
        <p class="description">Bài viết sẽ hiển thị ở đầu danh sách trên trang chủ.</p>
        <?php
    }

    // ============================================================
    // ENTERPRISE FEATURES: TOP 5 PRO & SMART CONTRIBUTION
    // ============================================================

    /**
     * ENTERPRISE 1: Register Custom Post Status "Completed"
     */
    public function register_custom_post_status() {
        register_post_status( 'completed', array(
            'label'                     => _x( 'Đã xử lý', 'post status', 'can-giuoc-food' ),
            'public'                    => true,
            'exclude_from_search'       => false,
            'show_in_admin_all_list'    => true,
            'show_in_admin_status_list' => true,
            'label_count'               => _n_noop( 'Đã xử lý <span class="count">(%s)</span>', 'Đã xử lý <span class="count">(%s)</span>', 'can-giuoc-food' ),
        ));
    }

    /**
     * ENTERPRISE 2: Top 5 Pro - Scheduling Meta Box
     */
    public function add_top5_scheduling_meta_box() {
        add_meta_box(
            'top5_scheduling',
            '📅 Lịch hiển thị Top 5 (Pro)',
            array( $this, 'render_top5_scheduling_meta_box' ),
            'quan_an',
            'side',
            'high'
        );
    }

    public function render_top5_scheduling_meta_box( $post ) {
        wp_nonce_field( 'top5_scheduling_nonce', 'top5_scheduling_nonce' );
        
        $start_date = get_post_meta( $post->ID, '_top_start_date', true );
        $end_date = get_post_meta( $post->ID, '_top_end_date', true );
        $click_count = get_post_meta( $post->ID, '_ads_click_count', true ) ?: 0;
        $is_closed = get_post_meta( $post->ID, '_is_closed', true );
        $is_manual_top_5 = get_post_meta( $post->ID, '_is_manual_top_5', true );
        $manual_top_5_order = get_post_meta( $post->ID, '_manual_top_5_order', true );
        ?>
        <div class="top5-scheduling-box">
            <!-- GHIM THỦ CÔNG TOP 5 -->
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 15px;">
                <p style="margin: 0 0 10px 0;">
                    <label>
                        <input type="checkbox" name="is_manual_top_5" value="1" <?php checked( $is_manual_top_5, '1' ); ?> />
                        <strong>⭐ Ghim Top 5 Thủ Công</strong>
                    </label><br>
                    <span class="description">Ưu tiên tuyệt đối hiển thị trong Top 5 Yêu Thích</span>
                </p>
                
                <p style="margin: 0;">
                    <label for="manual_top_5_order"><strong>🔢 Số thứ tự ưu tiên:</strong></label><br>
                    <input type="number" id="manual_top_5_order" name="manual_top_5_order" value="<?php echo esc_attr( $manual_top_5_order ); ?>" min="1" max="5" style="width: 100px;" placeholder="1-5" />
                    <span class="description">(1 = Cao nhất, 5 = Thấp nhất)</span>
                </p>
            </div>
            
            <hr>
            
            <!-- LỊCH HIỂN THỊ (Schedule) -->
            <p>
                <label for="top_start_date"><strong>📅 Ngày bắt đầu:</strong></label><br>
                <input type="date" id="top_start_date" name="top_start_date" value="<?php echo esc_attr( $start_date ); ?>" style="width: 100%;" />
            </p>
            
            <p>
                <label for="top_end_date"><strong>📅 Ngày kết thúc:</strong></label><br>
                <input type="date" id="top_end_date" name="top_end_date" value="<?php echo esc_attr( $end_date ); ?>" style="width: 100%;" />
            </p>
            
            <hr>
            
            <p>
                <strong>📊 Số lượt click:</strong><br>
                <input type="text" value="<?php echo esc_attr( $click_count ); ?>" readonly style="width: 100%; background: #f0f0f0; font-size: 18px; font-weight: bold; text-align: center;" />
                <span class="description">Chỉ đọc - Tự động cập nhật khi khách click</span>
            </p>
            
            <hr>
            
            <p>
                <label>
                    <input type="checkbox" name="is_closed" value="1" <?php checked( $is_closed, '1' ); ?> />
                    <strong>⛔ Quán đã đóng cửa</strong>
                </label><br>
                <span class="description">Giữ Published nhưng hiển thị badge "Đã đóng cửa"</span>
            </p>
        </div>
        <?php
    }

    /**
     * ENTERPRISE 3: Save Top 5 Scheduling Data
     */
    public function save_top5_scheduling_data( $post_id ) {
        if ( ! isset( $_POST['top5_scheduling_nonce'] ) || ! wp_verify_nonce( $_POST['top5_scheduling_nonce'], 'top5_scheduling_nonce' ) ) {
            return;
        }
        
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
        if ( ! current_user_can( 'edit_post', $post_id ) ) return;
        
        // Save manual Top 5 fields
        $is_manual_top_5 = isset( $_POST['is_manual_top_5'] ) ? '1' : '0';
        update_post_meta( $post_id, '_is_manual_top_5', $is_manual_top_5 );
        
        if ( isset( $_POST['manual_top_5_order'] ) ) {
            update_post_meta( $post_id, '_manual_top_5_order', intval( $_POST['manual_top_5_order'] ) );
        }
        
        // Save dates
        if ( isset( $_POST['top_start_date'] ) ) {
            update_post_meta( $post_id, '_top_start_date', sanitize_text_field( $_POST['top_start_date'] ) );
        }
        
        if ( isset( $_POST['top_end_date'] ) ) {
            update_post_meta( $post_id, '_top_end_date', sanitize_text_field( $_POST['top_end_date'] ) );
        }
        
        // Save is_closed
        $is_closed = isset( $_POST['is_closed'] ) ? '1' : '0';
        update_post_meta( $post_id, '_is_closed', $is_closed );
    }

    /**
     * ENTERPRISE 4: REST API - Click Tracking Endpoint with Rate Limiting
     */
    public function register_tracking_endpoint() {
        register_rest_route( 'cg/v1', '/track-click/(?P<id>\d+)', array(
            'methods'  => 'POST',
            'callback' => array( $this, 'track_restaurant_click' ),
            'permission_callback' => '__return_true',
            'args' => array(
                'id' => array(
                    'validate_callback' => function( $param ) {
                        return is_numeric( $param );
                    }
                ),
            ),
        ));
    }

    public function track_restaurant_click( $request ) {
        $post_id = $request['id'];
        $user_ip = $this->get_client_ip();
        
        // Rate Limiting: 1 click per IP per restaurant per 24h
        $transient_key = 'click_track_' . $post_id . '_' . md5( $user_ip );
        
        if ( get_transient( $transient_key ) ) {
            return new WP_REST_Response( array( 
                'success' => false, 
                'message' => 'Rate limit exceeded' 
            ), 429 );
        }
        
        // Increment click count
        $current_count = get_post_meta( $post_id, '_ads_click_count', true ) ?: 0;
        $new_count = intval( $current_count ) + 1;
        update_post_meta( $post_id, '_ads_click_count', $new_count );
        
        // Set transient for 24 hours
        set_transient( $transient_key, true, 24 * HOUR_IN_SECONDS );
        
        return new WP_REST_Response( array( 
            'success' => true, 
            'count' => $new_count 
        ), 200 );
    }

    /**
     * Helper: Get Client IP
     */
    private function get_client_ip() {
        $ip_keys = array( 'HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR' );
        
        foreach ( $ip_keys as $key ) {
            if ( array_key_exists( $key, $_SERVER ) === true ) {
                foreach ( explode( ',', $_SERVER[ $key ] ) as $ip ) {
                    $ip = trim( $ip );
                    if ( filter_var( $ip, FILTER_VALIDATE_IP ) !== false ) {
                        return $ip;
                    }
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /**
     * ENTERPRISE 5: REST API Fields for Scheduling
     */
    public function register_top5_rest_fields() {
        // is_active_top_pick: Check if restaurant is in valid date range
        register_rest_field( 'quan_an', 'is_active_top_pick', array(
            'get_callback' => function( $post ) {
                $is_top = get_post_meta( $post['id'], '_is_top_pick', true );
                if ( ! $is_top ) return false;
                
                $start = get_post_meta( $post['id'], '_top_start_date', true );
                $end = get_post_meta( $post['id'], '_top_end_date', true );
                $today = current_time( 'Y-m-d' );
                
                // Check if within date range
                if ( $start && $today < $start ) return false;
                if ( $end && $today > $end ) return false;
                
                return true;
            },
            'schema' => array(
                'description' => 'Whether restaurant is actively in Top 5 (considering date range)',
                'type'        => 'boolean',
            ),
        ));
        
        // is_closed field
        register_rest_field( 'quan_an', 'is_closed', array(
            'get_callback' => function( $post ) {
                return get_post_meta( $post['id'], '_is_closed', true ) === '1';
            },
            'schema' => array(
                'description' => 'Whether restaurant is permanently closed',
                'type'        => 'boolean',
            ),
        ));
        
        // ads_click_count field
        register_rest_field( 'quan_an', 'ads_click_count', array(
            'get_callback' => function( $post ) {
                return intval( get_post_meta( $post['id'], '_ads_click_count', true ) ?: 0 );
            },
            'schema' => array(
                'description' => 'Number of clicks on Top 5 ads',
                'type'        => 'integer',
            ),
        ));
        
        // is_manual_top_5 field
        register_rest_field( 'quan_an', 'is_manual_top_5', array(
            'get_callback' => function( $post ) {
                return get_post_meta( $post['id'], '_is_manual_top_5', true ) === '1';
            },
            'schema' => array(
                'description' => 'Whether restaurant is manually pinned to Top 5',
                'type'        => 'boolean',
            ),
        ));
        
        // manual_top_5_order field
        register_rest_field( 'quan_an', 'manual_top_5_order', array(
            'get_callback' => function( $post ) {
                return intval( get_post_meta( $post['id'], '_manual_top_5_order', true ) ?: 999 );
            },
            'schema' => array(
                'description' => 'Manual Top 5 priority order (1-5, lower is higher priority)',
                'type'        => 'integer',
            ),
        ));
    }

    /**
     * ========================================
     * 11. SMART CONTRIBUTION SYSTEM
     * ========================================
     */
    
    /**
     * Register bao_cao post type for user reports
     */
    public function register_cpt_bao_cao() {
        $labels = array(
            'name'                  => 'Báo Cáo',
            'singular_name'         => 'Báo cáo',
            'menu_name'             => 'Báo Cáo',
            'add_new'               => 'Thêm mới',
            'all_items'             => 'Tất cả báo cáo',
            'edit_item'             => 'Xử lý báo cáo',
        );

        $args = array(
            'labels'                => $labels,
            'supports'              => array( 'title', 'editor' ),
            'public'                => false,
            'show_ui'               => true,
            'show_in_menu'          => true,
            'menu_position'         => 7,
            'menu_icon'             => 'dashicons-flag',
            'has_archive'           => false,
            'capability_type'       => 'post',
            'show_in_rest'          => true,
            'rest_base'             => 'bao_cao',
        );

        register_post_type( 'bao_cao', $args );
    }
    
    /**
     * Add meta box for quick report processing
     */
    public function add_report_processing_meta_box() {
        add_meta_box(
            'report_processing',
            '⚡ Xử lý nhanh (One-Click Merge)',
            array( $this, 'render_report_processing_meta_box' ),
            'bao_cao',
            'normal',
            'high'
        );
        
        // Add meta box for report details
        add_meta_box(
            'report_details',
            '📝 Thông tin báo cáo',
            array( $this, 'render_report_details_meta_box' ),
            'bao_cao',
            'side',
            'default'
        );
    }
    
    /**
     * Render report processing meta box with comparison UI
     */
    public function render_report_processing_meta_box( $post ) {
        wp_nonce_field( 'report_processing_nonce', 'report_processing_nonce_field' );
        
        $restaurant_id = get_post_meta( $post->ID, '_reported_restaurant_id', true );
        $report_type = get_post_meta( $post->ID, '_report_type', true );
        $suggested_changes = get_post_meta( $post->ID, '_suggested_changes', true );
        $merge_status = get_post_meta( $post->ID, '_merge_status', true );
        
        if ( ! $restaurant_id ) {
            echo '<p style="color: #999;">Chưa có thông tin quán ăn được báo cáo.</p>';
            return;
        }
        
        // Get current restaurant data
        $restaurant = get_post( $restaurant_id );
        if ( ! $restaurant ) {
            echo '<p style="color: #d63638;">❌ Không tìm thấy quán ăn (ID: ' . $restaurant_id . ')</p>';
            return;
        }
        
        // Decode suggested changes
        $changes = json_decode( $suggested_changes, true );
        if ( ! $changes ) {
            $changes = array();
        }
        
        // Display status
        if ( $merge_status === 'approved' ) {
            echo '<div style="background: #d1e7dd; border-left: 4px solid #0f5132; padding: 12px; margin-bottom: 20px;">';
            echo '<strong style="color: #0f5132;">✅ Đã xử lý và cập nhật</strong>';
            echo '</div>';
        }
        
        ?>
        <style>
            .comparison-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .comparison-table th { background: #f0f0f1; padding: 12px; text-align: left; font-weight: 600; }
            .comparison-table td { padding: 12px; border-bottom: 1px solid #ddd; vertical-align: top; }
            .comparison-table tr:hover { background: #f9f9f9; }
            .current-value { color: #666; }
            .suggested-value { color: #2271b1; font-weight: 600; }
            .changed-row { background: #fff3cd; }
            .merge-button { background: #00a32a; color: white; border: none; padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 4px; cursor: pointer; }
            .merge-button:hover { background: #008a20; }
            .merge-button:disabled { background: #ddd; cursor: not-allowed; }
        </style>
        
        <h3>📊 So sánh dữ liệu</h3>
        <p><strong>Quán:</strong> <a href="<?php echo get_edit_post_link( $restaurant_id ); ?>" target="_blank"><?php echo esc_html( $restaurant->post_title ); ?></a></p>
        <p><strong>Loại báo cáo:</strong> <?php echo esc_html( $report_type ?: 'Không xác định' ); ?></p>
        
        <table class="comparison-table">
            <thead>
                <tr>
                    <th style="width: 30%;">Trường dữ liệu</th>
                    <th style="width: 35%;">Hiện tại</th>
                    <th style="width: 35%;">Đề xuất thay đổi</th>
                </tr>
            </thead>
            <tbody>
                <?php
                // Special handling for "closed" status
                if ( $report_type === 'closed' ) {
                    $is_closed = get_post_meta( $restaurant_id, '_is_closed', true );
                    echo '<tr class="changed-row">';
                    echo '<td><strong>Trạng thái</strong></td>';
                    echo '<td class="current-value">' . ( $is_closed ? '⛔ Đã đóng cửa' : '✅ Đang hoạt động' ) . '</td>';
                    echo '<td class="suggested-value">⛔ Đã đóng cửa</td>';
                    echo '</tr>';
                }
                
                // Display other suggested changes
                if ( ! empty( $changes ) ) {
                    foreach ( $changes as $field => $new_value ) {
                        $current_value = get_post_meta( $restaurant_id, '_' . $field, true );
                        
                        $field_labels = array(
                            'address' => 'Địa chỉ',
                            'phone' => 'Số điện thoại',
                            'price' => 'Giá',
                            'opening_hours' => 'Giờ mở cửa',
                        );
                        
                        $label = isset( $field_labels[$field] ) ? $field_labels[$field] : ucfirst( $field );
                        
                        $is_changed = $current_value !== $new_value;
                        $row_class = $is_changed ? 'changed-row' : '';
                        
                        echo '<tr class="' . $row_class . '">';
                        echo '<td><strong>' . esc_html( $label ) . '</strong></td>';
                        echo '<td class="current-value">' . esc_html( $current_value ?: '(Trống)' ) . '</td>';
                        echo '<td class="suggested-value">' . esc_html( $new_value ?: '(Trống)' ) . '</td>';
                        echo '</tr>';
                    }
                }
                
                if ( empty( $changes ) && $report_type !== 'closed' ) {
                    echo '<tr><td colspan="3" style="text-align: center; color: #999;">Không có thay đổi được đề xuất</td></tr>';
                }
                ?>
            </tbody>
        </table>
        
        <?php if ( $merge_status !== 'approved' ) : ?>
            <button type="button" class="merge-button" onclick="approveAndMerge(<?php echo $post->ID; ?>)">
                ✅ CHẤP THUẬN & CẬP NHẬT
            </button>
            <span id="merge-status" style="margin-left: 12px; font-weight: 600;"></span>
        <?php endif; ?>
        <?php
    }
    
    /**
     * Render report details meta box
     */
    public function render_report_details_meta_box( $post ) {
        $restaurant_id = get_post_meta( $post->ID, '_reported_restaurant_id', true );
        $report_type = get_post_meta( $post->ID, '_report_type', true );
        $reporter_name = get_post_meta( $post->ID, '_reporter_name', true );
        $reporter_email = get_post_meta( $post->ID, '_reporter_email', true );
        $proof_images = get_post_meta( $post->ID, '_proof_images', true );
        
        ?>
        <div style="margin: 12px 0;">
            <label><strong>ID Quán ăn:</strong></label>
            <input type="number" name="reported_restaurant_id" value="<?php echo esc_attr( $restaurant_id ); ?>" style="width: 100%;" />
        </div>
        
        <div style="margin: 12px 0;">
            <label><strong>Loại báo cáo:</strong></label>
            <select name="report_type" style="width: 100%;">
                <option value="closed" <?php selected( $report_type, 'closed' ); ?>>Quán đã đóng cửa</option>
                <option value="wrong_info" <?php selected( $report_type, 'wrong_info' ); ?>>Thông tin sai</option>
                <option value="other" <?php selected( $report_type, 'other' ); ?>>Khác</option>
            </select>
        </div>
        
        <div style="margin: 12px 0;">
            <label><strong>Người báo cáo:</strong></label>
            <input type="text" name="reporter_name" value="<?php echo esc_attr( $reporter_name ); ?>" style="width: 100%;" />
        </div>
        
        <div style="margin: 12px 0;">
            <label><strong>Email:</strong></label>
            <input type="email" name="reporter_email" value="<?php echo esc_attr( $reporter_email ); ?>" style="width: 100%;" />
        </div>
        
        <div style="margin: 12px 0;">
            <label><strong>Thay đổi đề xuất (JSON):</strong></label>
            <textarea name="suggested_changes" rows="6" style="width: 100%; font-family: monospace; font-size: 12px;"><?php echo esc_textarea( get_post_meta( $post->ID, '_suggested_changes', true ) ); ?></textarea>
            <p style="font-size: 11px; color: #666;">Format: {"field": "value", "address": "123 Street"}</p>
        </div>
        <?php
    }
    
    /**
     * Save report meta data
     */
    public function save_report_meta_data( $post_id ) {
        if ( get_post_type( $post_id ) !== 'bao_cao' ) {
            return;
        }
        
        if ( ! isset( $_POST['reported_restaurant_id'] ) ) {
            return;
        }
        
        update_post_meta( $post_id, '_reported_restaurant_id', intval( $_POST['reported_restaurant_id'] ) );
        update_post_meta( $post_id, '_report_type', sanitize_text_field( $_POST['report_type'] ) );
        update_post_meta( $post_id, '_reporter_name', sanitize_text_field( $_POST['reporter_name'] ) );
        update_post_meta( $post_id, '_reporter_email', sanitize_email( $_POST['reporter_email'] ) );
        update_post_meta( $post_id, '_suggested_changes', sanitize_textarea_field( $_POST['suggested_changes'] ) );
    }
    
    /**
     * AJAX handler for approve and merge
     */
    public function handle_approve_and_merge() {
        check_ajax_referer( 'report_processing_nonce', 'nonce' );
        
        if ( ! current_user_can( 'edit_posts' ) ) {
            wp_send_json_error( array( 'message' => 'Không có quyền thực hiện' ) );
        }
        
        $report_id = intval( $_POST['report_id'] );
        $restaurant_id = get_post_meta( $report_id, '_reported_restaurant_id', true );
        $report_type = get_post_meta( $report_id, '_report_type', true );
        $suggested_changes = get_post_meta( $report_id, '_suggested_changes', true );
        
        if ( ! $restaurant_id ) {
            wp_send_json_error( array( 'message' => 'Không tìm thấy quán ăn' ) );
        }
        
        // Handle "closed" status
        if ( $report_type === 'closed' ) {
            update_post_meta( $restaurant_id, '_is_closed', true );
            // Keep post published for SEO
        }
        
        // Apply suggested changes
        $changes = json_decode( $suggested_changes, true );
        if ( is_array( $changes ) ) {
            foreach ( $changes as $field => $value ) {
                update_post_meta( $restaurant_id, '_' . $field, sanitize_text_field( $value ) );
            }
        }
        
        // Update report status
        update_post_meta( $report_id, '_merge_status', 'approved' );
        wp_update_post( array(
            'ID' => $report_id,
            'post_status' => 'completed'
        ));
        
        wp_send_json_success( array( 
            'message' => 'Đã cập nhật thành công!',
            'restaurant_id' => $restaurant_id
        ));
    }
    
    /**
     * Enqueue JavaScript for report processing
     */
    public function enqueue_report_processing_script() {
        $screen = get_current_screen();
        if ( $screen && $screen->post_type === 'bao_cao' ) {
            ?>
            <script>
            function approveAndMerge(reportId) {
                if (!confirm('Xác nhận cập nhật thông tin quán ăn theo báo cáo này?')) {
                    return;
                }
                
                const button = event.target;
                const statusEl = document.getElementById('merge-status');
                
                button.disabled = true;
                button.textContent = '⏳ Đang xử lý...';
                statusEl.textContent = '';
                
                jQuery.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'approve_and_merge',
                        report_id: reportId,
                        nonce: jQuery('#report_processing_nonce_field').val()
                    },
                    success: function(response) {
                        if (response.success) {
                            statusEl.innerHTML = '<span style="color: #00a32a;">✅ ' + response.data.message + '</span>';
                            setTimeout(function() {
                                location.reload();
                            }, 1500);
                        } else {
                            statusEl.innerHTML = '<span style="color: #d63638;">❌ ' + response.data.message + '</span>';
                            button.disabled = false;
                            button.textContent = '✅ CHẤP THUẬN & CẬP NHẬT';
                        }
                    },
                    error: function() {
                        statusEl.innerHTML = '<span style="color: #d63638;">❌ Lỗi kết nối</span>';
                        button.disabled = false;
                        button.textContent = '✅ CHẤP THUẬN & CẬP NHẬT';
                    }
                });
            }
            </script>
            <?php
        }
    }

    /**
     * REST API endpoint để nhận báo cáo từ frontend
     */
    public function register_report_submission_endpoint() {
        register_rest_route( 'cg/v1', '/submit-report', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'handle_report_submission' ),
            'permission_callback' => '__return_true',
            'args'                => array(
                'restaurant_id' => array(
                    'required'          => true,
                    'type'              => 'integer',
                    'validate_callback' => function( $param ) {
                        return is_numeric( $param );
                    }
                ),
                'report_type' => array(
                    'required' => true,
                    'type'     => 'string',
                    'enum'     => array( 'closed', 'wrong_info', 'other' ),
                ),
                'reporter_name' => array(
                    'required'          => false,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'reporter_email' => array(
                    'required'          => false,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_email',
                ),
                'message' => array(
                    'required'          => false,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_textarea_field',
                ),
                'suggested_changes' => array(
                    'required' => false,
                    'type'     => 'object',
                ),
            ),
        ));
    }
    
    /**
     * Xử lý báo cáo được gửi từ frontend
     */
    public function handle_report_submission( $request ) {
        $restaurant_id = $request->get_param( 'restaurant_id' );
        $report_type = $request->get_param( 'report_type' );
        $reporter_name = $request->get_param( 'reporter_name' );
        $reporter_email = $request->get_param( 'reporter_email' );
        $message = $request->get_param( 'message' );
        $suggested_changes = $request->get_param( 'suggested_changes' );
        
        // Kiểm tra quán ăn có tồn tại không
        $restaurant = get_post( $restaurant_id );
        if ( ! $restaurant || $restaurant->post_type !== 'quan_an' ) {
            return new WP_REST_Response( array(
                'success' => false,
                'message' => 'Không tìm thấy quán ăn này'
            ), 404 );
        }
        
        // Tạo tiêu đề báo cáo
        $report_title = '';
        switch ( $report_type ) {
            case 'closed':
                $report_title = 'Báo cáo: ' . $restaurant->post_title . ' đã đóng cửa';
                break;
            case 'wrong_info':
                $report_title = 'Báo cáo thông tin sai: ' . $restaurant->post_title;
                break;
            default:
                $report_title = 'Báo cáo khác: ' . $restaurant->post_title;
        }
        
        // Tạo nội dung báo cáo
        $report_content = '';
        if ( $message ) {
            $report_content = $message;
        }
        if ( $reporter_name ) {
            $report_content .= "\n\n---\nNgười báo cáo: " . $reporter_name;
        }
        if ( $reporter_email ) {
            $report_content .= "\nEmail: " . $reporter_email;
        }
        
        // Tạo bài viết báo cáo
        $report_id = wp_insert_post( array(
            'post_title'   => $report_title,
            'post_content' => $report_content,
            'post_type'    => 'bao_cao',
            'post_status'  => 'publish',
        ));
        
        if ( is_wp_error( $report_id ) ) {
            return new WP_REST_Response( array(
                'success' => false,
                'message' => 'Không thể tạo báo cáo. Vui lòng thử lại sau.'
            ), 500 );
        }
        
        // Lưu meta data
        update_post_meta( $report_id, '_reported_restaurant_id', $restaurant_id );
        update_post_meta( $report_id, '_report_type', $report_type );
        update_post_meta( $report_id, '_reporter_name', $reporter_name );
        update_post_meta( $report_id, '_reporter_email', $reporter_email );
        update_post_meta( $report_id, '_merge_status', 'pending' );
        
        // Lưu suggested changes nếu có
        if ( $suggested_changes && is_array( $suggested_changes ) ) {
            update_post_meta( $report_id, '_suggested_changes', wp_json_encode( $suggested_changes ) );
        }
        
        return new WP_REST_Response( array(
            'success'   => true,
            'message'   => 'Cảm ơn bạn đã gửi báo cáo! Chúng tôi sẽ xem xét trong thời gian sớm nhất.',
            'report_id' => $report_id
        ), 201 );
    }
}

new Can_Giuoc_Food_Core();
