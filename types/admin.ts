export interface BlogPost {
  id?: string;
  title: string;
  content: string;
  excerpt: string;
  coverImage: string | null;
  published: boolean;
  slug?: string;
  publishedAt?: string | null;
  createdAt?: string;
  author?: {
    name: string;
    email: string;
  };
  _count?: {
    comments: number;
  };
}

export interface TutorialVideo {
  id?: string;
  title: string;
  description: string;
  videoUrl: string | null;
  s3Key?: string | null;
  s3Url?: string | null;
  thumbnail?: string | null;
  published: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  uploader?: {
    name: string;
    email: string;
  };
}
