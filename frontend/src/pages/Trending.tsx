import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, Flame, Star, Calendar, Users, BarChart3 } from "lucide-react"

// Type definitions
interface TrendingManga {
  id: number;
  title: string;
  rank: number;
  change: string;
  rating: number;
  views: string;
  chapters: number;
  image: string;
  trending: 'up' | 'down' | 'same';
}

// Mock trending data
const trendingDaily: TrendingManga[] = [
  {
    id: 1,
    title: "Solo Leveling",
    rank: 1,
    change: "+2",
    rating: 4.9,
    views: "156K",
    chapters: 179,
    image: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=300&h=400&fit=crop",
    trending: "up"
  },
  {
    id: 2,
    title: "Tower of God",
    rank: 2,
    change: "-1",
    rating: 4.8,
    views: "134K",
    chapters: 523,
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&h=400&fit=crop",
    trending: "down"
  },
  {
    id: 3,
    title: "Jujutsu Kaisen",
    rank: 3,
    change: "0",
    rating: 4.7,
    views: "128K",
    chapters: 241,
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&h=400&fit=crop",
    trending: "same"
  }
]

const trendingWeekly: TrendingManga[] = [
  {
    id: 1,
    title: "Chainsaw Man",
    rank: 1,
    change: "+3",
    rating: 4.8,
    views: "892K",
    chapters: 97,
    image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=400&fit=crop",
    trending: "up"
  },
  {
    id: 2,
    title: "One Piece",
    rank: 2,
    change: "-1",
    rating: 4.9,
    views: "856K",
    chapters: 1000,
    image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=300&h=400&fit=crop",
    trending: "down"
  }
]

const trendingMonthly: TrendingManga[] = [
  {
    id: 1,
    title: "Attack on Titan",
    rank: 1,
    change: "+1",
    rating: 4.9,
    views: "2.1M",
    chapters: 139,
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&h=400&fit=crop",
    trending: "up"
  }
]

const trendingStats = [
  {
    title: "Total Views Today",
    value: "2.4M",
    change: "+12.5%",
    icon: BarChart3,
    color: "text-blue-600"
  },
  {
    title: "New Readers",
    value: "8.2K",
    change: "+8.1%",
    icon: Users,
    color: "text-green-600"
  },
  {
    title: "Trending Manga",
    value: "156",
    change: "+3.2%",
    icon: Flame,
    color: "text-orange-600"
  },
  {
    title: "Active Today",
    value: "45K",
    change: "+5.7%",
    icon: TrendingUp,
    color: "text-purple-600"
  }
]

const TrendingCard: React.FC<{
  manga: TrendingManga;
  period: string;
  onCardClick?: (mangaId: number) => void;
}> = ({ manga, period, onCardClick }) => {
  const getTrendingIcon = () => {
    switch (manga.trending) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
      default: return <div className="w-4 h-4" />
    }
  }

  const getChangeColor = () => {
    if (manga.change.startsWith('+')) return 'text-green-600'
    if (manga.change.startsWith('-')) return 'text-red-600'
    return 'text-muted-foreground'
  }

  return (
    <Card
      className="group cursor-pointer hover:shadow-lg transition-all duration-300"
      onClick={() => onCardClick?.(manga.id)}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Rank Badge */}
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white
            ${manga.rank === 1 ? 'bg-yellow-500' :
              manga.rank === 2 ? 'bg-muted-foreground' :
                manga.rank === 3 ? 'bg-amber-600' : 'bg-muted-foreground/70'}
          `}>
            #{manga.rank}
          </div>

          {/* Image */}
          <img
            src={manga.image}
            alt={manga.title}
            className="w-16 h-20 object-cover rounded-lg"
          />

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg line-clamp-1">{manga.title}</h3>
              <div className="flex items-center gap-1">
                {getTrendingIcon()}
                <span className={`text-sm font-medium ${getChangeColor()}`}>
                  {manga.change}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{manga.rating}</span>
              </div>
              <span>{manga.views} views</span>
              <span>{manga.chapters} ch</span>
            </div>

            <Badge variant="outline" className="text-xs">
              Trending {period}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const Trending: React.FC = () => {
  const navigate = useNavigate()
  const [selectedPeriod, setSelectedPeriod] = React.useState<'daily' | 'weekly' | 'monthly'>('daily')

  const getCurrentTrending = () => {
    switch (selectedPeriod) {
      case 'daily': return trendingDaily
      case 'weekly': return trendingWeekly
      case 'monthly': return trendingMonthly
      default: return trendingDaily
    }
  }

  const handleMangaClick = (mangaId: number) => {
    // Note: Mock data uses integer IDs. Real implementation would use UUID from API.
    navigate({ to: '/manga/$mangaId', params: { mangaId: String(mangaId) } })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Trending</h1>
        <p className="text-muted-foreground">See what's hot and trending in the manga world</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {trendingStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-green-600">{stat.change}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Top Trending Manga</h2>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                  className="capitalize"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  {period}
                </Button>
              ))}
            </div>
          </div>

          {/* Trending List */}
          <div className="space-y-4">
            {getCurrentTrending().map((manga) => (
              <TrendingCard key={manga.id} manga={manga} period={selectedPeriod} onCardClick={handleMangaClick} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hot Topics */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Hot Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { topic: "New Season Announcements", count: "23 discussions" },
              { topic: "Manga Recommendations", count: "156 discussions" },
              { topic: "Chapter Reviews", count: "89 discussions" },
              { topic: "Anime Adaptations", count: "67 discussions" },
              { topic: "Artist Spotlights", count: "34 discussions" },
              { topic: "Industry News", count: "45 discussions" }
            ].map((item, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <div>
                      <h3 className="font-medium">{item.topic}</h3>
                      <p className="text-sm text-muted-foreground">{item.count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trending Charts */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Trending Analytics</h2>
          <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Interactive charts coming soon...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Trending
