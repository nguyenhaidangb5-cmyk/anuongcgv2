// Types dùng chung cho Firebase ratings (Multi-criteria schema)
export interface FirebaseRating {
    count: number;
    totalTaste: number;
    totalPrice: number;
    totalService: number;
    totalSpace: number;
    totalOverall: number;
}
