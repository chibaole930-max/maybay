// Adapter mock API sẵn sàng kết nối Backend / Microservice thật mà không cần thay đổi giao diện.
import type { Airport, GameState, Plane } from '@/types';
import { airports as mockAirports, planes as mockPlanes } from './mock-data';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const gameApi = {
  /**
   * Lấy danh mục sân bay và máy bay từ máy chủ
   */
  async getCatalog(): Promise<ApiResponse<{ airports: Airport[]; planes: Plane[] }>> {
    return {
      success: true,
      data: {
        airports: mockAirports,
        planes: mockPlanes,
      },
    };
  },

  /**
   * Đồng bộ lưu trữ tiến trình game lên Cloud Backend
   */
  async saveGameState(state: GameState): Promise<ApiResponse<boolean>> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('vietnam-airline-tycoon-backup', JSON.stringify(state));
      }
      return { success: true, data: true, message: 'Đồng bộ đám mây thành công.' };
    } catch (err) {
      return { success: false, data: false, message: 'Không thể lưu trữ.' };
    }
  },

  /**
   * Tải tiến trình game từ Cloud
   */
  async loadGameState(): Promise<ApiResponse<GameState | null>> {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('vietnam-airline-tycoon-backup');
        if (raw) {
          return { success: true, data: JSON.parse(raw) };
        }
      }
      return { success: true, data: null };
    } catch {
      return { success: false, data: null };
    }
  },

  /**
   * Lấy bảng xếp hạng toàn cầu
   */
  async getLeaderboard(): Promise<ApiResponse<{ rank: number; name: string; value: number }[]>> {
    return {
      success: true,
      data: [],
    };
  },
};
