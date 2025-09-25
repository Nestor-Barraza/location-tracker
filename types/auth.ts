export interface User {
  id: string;
  username: string;
  role: 'user' | 'admin';
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface Location {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
}