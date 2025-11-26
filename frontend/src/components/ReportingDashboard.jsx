import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  alpha,
  useTheme,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  BarChart as BarChartIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  TrendingUp,
  CalendarToday as CalendarTodayIcon,
  PersonAdd as PersonAddIcon,
  AccessTime as AccessTimeIcon,
  Link as LinkIcon,
  CheckCircle as CheckCircleIcon,
  SentimentSatisfied as SentimentSatisfiedIcon,
  Article as ArticleIcon,
  Share as ShareIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { reportingAPI, syncAPI } from "../services/api";
import ScrunchVisualizations from "./reporting/charts/ScrunchVisualizations";
// Import reusable components and utilities
import ChartCard from "./reporting/ChartCard";
import SectionContainer from "./reporting/SectionContainer";
import KPICard from "./reporting/KPICard";
import KPIGrid from "./reporting/KPIGrid";
import { formatValue, getSourceColor, getSourceLabel, getMonthName, getChannelLabel, getChannelColor } from "./reporting/utils";
import { CHART_COLORS } from "./reporting/constants";
import { useChartData, formatDateForAxis, getDateRangeLabel as getDateRangeLabelUtil } from "./reporting/hooks/useChartData";
// Import enhanced chart components (keeping original Recharts imports for now to avoid breaking changes)
import LineChartEnhanced from "./reporting/charts/LineChart";
import BarChartEnhanced from "./reporting/charts/BarChart";
import PieChartEnhanced from "./reporting/charts/PieChart";

// Define all KPIs in order: GA4 (9), AgencyAnalytics (8), Scrunch (11)
const KPI_ORDER = [
  // GA4 KPIs
  "users",
  "sessions",
  "new_users",
  "engaged_sessions",
  "bounce_rate",
  "avg_session_duration",
  "ga4_engagement_rate",
  "conversions",
  "revenue",
  // AgencyAnalytics KPIs
  // 'impressions', 'clicks', 'ctr', // COMMENTED OUT: Estimated KPIs (not 100% accurate from source)
  "search_volume",
  "avg_keyword_rank",
  "ranking_change",
  // New/Updated Google Ranking KPIs
  "google_ranking_count",
  "google_ranking",
  "google_ranking_change",
  "all_keywords_ranking",
  "keyword_ranking_change_and_volume",
  // Scrunch KPIs
  // 'influencer_reach', 'scrunch_engagement_rate', 'total_interactions', 'cost_per_engagement', // COMMENTED OUT: Estimated KPIs (not 100% accurate from source)
  "total_citations",
  "brand_presence_rate",
  "brand_sentiment_score",
  "top10_prompt_percentage",
  "prompt_search_volume",
  // New Scrunch KPIs
  // "competitive_benchmarking",
];

// KPI metadata for display
const KPI_METADATA = {
  // GA4 KPIs
  users: { label: "Users", source: "GA4", icon: "People" },
  sessions: { label: "Sessions", source: "GA4", icon: "BarChart" },
  new_users: { label: "New Users", source: "GA4", icon: "PersonAdd" },
  engaged_sessions: {
    label: "Engaged Sessions",
    source: "GA4",
    icon: "People",
  },
  bounce_rate: { label: "Bounce Rate", source: "GA4", icon: "TrendingDown" },
  avg_session_duration: {
    label: "Avg Session Duration",
    source: "GA4",
    icon: "AccessTime",
  },
  ga4_engagement_rate: {
    label: "Engagement Rate",
    source: "GA4",
    icon: "TrendingUp",
  },
  conversions: { label: "Conversions", source: "GA4", icon: "TrendingUp" },
  revenue: { label: "Revenue", source: "GA4", icon: "TrendingUp" },
  // AgencyAnalytics KPIs
  // 'impressions': { label: 'Impressions', source: 'AgencyAnalytics', icon: 'Visibility' }, // COMMENTED OUT: Estimated KPI
  // 'clicks': { label: 'Clicks', source: 'AgencyAnalytics', icon: 'TrendingUp' }, // COMMENTED OUT: Estimated KPI
  // 'ctr': { label: 'CTR', source: 'AgencyAnalytics', icon: 'BarChart' }, // COMMENTED OUT: Estimated KPI
  search_volume: {
    label: "Search Volume",
    source: "AgencyAnalytics",
    icon: "Search",
  },
  avg_keyword_rank: {
    label: "Avg Keyword Rank",
    source: "AgencyAnalytics",
    icon: "Search",
  },
  ranking_change: {
    label: "Avg Ranking Change",
    source: "AgencyAnalytics",
    icon: "TrendingUp",
  },
  // New/Updated Google Ranking KPIs
  google_ranking_count: {
    label: "Google Ranking Count",
    source: "AgencyAnalytics",
    icon: "Search",
  },
  google_ranking: {
    label: "Google Ranking",
    source: "AgencyAnalytics",
    icon: "Search",
  },
  google_ranking_change: {
    label: "Google Ranking Change",
    source: "AgencyAnalytics",
    icon: "TrendingUp",
  },
  all_keywords_ranking: {
    label: "All Keywords Ranking",
    source: "AgencyAnalytics",
    icon: "List",
  },
  keyword_ranking_change_and_volume: {
    label: "Keyword Ranking Change and Volume",
    source: "AgencyAnalytics",
    icon: "BarChart",
  },
  // Scrunch KPIs
  // 'influencer_reach': { label: 'Influencer Reach', source: 'Scrunch', icon: 'People' }, // COMMENTED OUT: Estimated KPI
  total_citations: {
    label: "Total Citations",
    source: "Scrunch",
    icon: "Link",
  },
  brand_presence_rate: {
    label: "Brand Presence Rate",
    source: "Scrunch",
    icon: "CheckCircle",
  },
  brand_sentiment_score: {
    label: "Brand Sentiment Score",
    source: "Scrunch",
    icon: "SentimentSatisfied",
  },
  // 'scrunch_engagement_rate': { label: 'Engagement Rate', source: 'Scrunch', icon: 'TrendingUp' }, // COMMENTED OUT: Estimated KPI
  // 'total_interactions': { label: 'Total Interactions', source: 'Scrunch', icon: 'Visibility' }, // COMMENTED OUT: Estimated KPI
  // 'cost_per_engagement': { label: 'Cost per Engagement', source: 'Scrunch', icon: 'TrendingUp' }, // COMMENTED OUT: Estimated KPI
  top10_prompt_percentage: {
    label: "Top 10 Prompt",
    source: "Scrunch",
    icon: "Article",
  },
  prompt_search_volume: {
    label: "Prompt Search Volume",
    source: "Scrunch",
    icon: "TrendingUp",
  },
  // New Scrunch KPIs
  competitive_benchmarking: {
    label: "Competitive Benchmarking",
    source: "Scrunch",
    icon: "BarChart",
  },
};

// Date range presets
const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Last year", days: 365 },
];

// Helper function to get month name
// getMonthName is now imported from utils

function ReportingDashboard({ publicSlug, brandInfo: publicBrandInfo }) {
  const isPublic = !!publicSlug;
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [scrunchData, setScrunchData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingScrunch, setLoadingScrunch] = useState(false);
  const [error, setError] = useState(null);
  const [selectedKPIs, setSelectedKPIs] = useState(new Set(KPI_ORDER));
  const [tempSelectedKPIs, setTempSelectedKPIs] = useState(new Set(KPI_ORDER)); // For dialog
  const [showKPISelector, setShowKPISelector] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set(["ga4", "agency_analytics", "scrunch_ai", "brand_analytics", "advanced_analytics"])); // Track expanded accordion sections
  // Initialize with "Last 7 days" as default
  const getDefaultDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [datePreset, setDatePreset] = useState("Last 7 days");
  const [brandAnalytics, setBrandAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareableUrl, setShareableUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedBrandSlug, setSelectedBrandSlug] = useState(null);
  // Pagination state for Scrunch AI Insights table
  const [insightsPage, setInsightsPage] = useState(0);
  const [insightsRowsPerPage, setInsightsRowsPerPage] = useState(10);
  // Public KPI selections (loaded from database for public view)
  const [publicKPISelections, setPublicKPISelections] = useState(null);
  // Section visibility state (for authenticated users to configure)
  const [visibleSections, setVisibleSections] = useState(new Set(["ga4", "agency_analytics", "scrunch_ai", "brand_analytics", "advanced_analytics"]));
  const [tempVisibleSections, setTempVisibleSections] = useState(new Set(["ga4", "agency_analytics", "scrunch_ai", "brand_analytics", "advanced_analytics"])); // For dialog
  // Chart/visualization selections (for each section)
  const [selectedCharts, setSelectedCharts] = useState(new Set());
  const [tempSelectedCharts, setTempSelectedCharts] = useState(new Set()); // For dialog
  // Public section visibility (loaded from database for public view)
  const [publicVisibleSections, setPublicVisibleSections] = useState(null);
  const [publicSelectedCharts, setPublicSelectedCharts] = useState(null);
  const theme = useTheme();

  // Load KPI selections from database when brand changes (for authenticated users)
  useEffect(() => {
    if (selectedBrandId && !isPublic) {
      loadKPISelections();
    }
  }, [selectedBrandId, isPublic]);

  // Load public KPI selections when in public mode
  useEffect(() => {
    if (selectedBrandId && isPublic) {
      loadPublicKPISelections();
    }
  }, [selectedBrandId, isPublic]);

  const loadKPISelections = async () => {
    if (!selectedBrandId) return;
    
    try {
      const data = await reportingAPI.getKPISelections(selectedBrandId);
      if (data) {
        // Load KPI selections
        if (data.selected_kpis && data.selected_kpis.length > 0) {
          setSelectedKPIs(new Set(data.selected_kpis));
          setTempSelectedKPIs(new Set(data.selected_kpis));
        } else {
          // If no selections saved, default to all available KPIs
          setSelectedKPIs(new Set(KPI_ORDER));
          setTempSelectedKPIs(new Set(KPI_ORDER));
        }
        
        // Load section visibility
        if (data.visible_sections && data.visible_sections.length > 0) {
          setVisibleSections(new Set(data.visible_sections));
          setTempVisibleSections(new Set(data.visible_sections));
        } else {
          // Default to all sections visible
          const defaultSections = new Set(["ga4", "agency_analytics", "scrunch_ai", "brand_analytics", "advanced_analytics"]);
          setVisibleSections(defaultSections);
          setTempVisibleSections(defaultSections);
          // Select all KPIs and charts by default
          setSelectedKPIs(new Set(KPI_ORDER));
          setTempSelectedKPIs(new Set(KPI_ORDER));
          const allCharts = new Set();
          defaultSections.forEach((sectionKey) => {
            getDashboardSectionCharts(sectionKey).forEach((chart) => {
              allCharts.add(chart.key);
            });
          });
          setSelectedCharts(allCharts);
          setTempSelectedCharts(allCharts);
        }
      }
    } catch (err) {
      console.error("Error loading KPI selections:", err);
      // Fallback to all KPIs and sections on error
      setSelectedKPIs(new Set(KPI_ORDER));
      setTempSelectedKPIs(new Set(KPI_ORDER));
      const defaultSections = new Set(["ga4", "agency_analytics", "scrunch_ai", "brand_analytics", "advanced_analytics"]);
      setVisibleSections(defaultSections);
      setTempVisibleSections(defaultSections);
      const allCharts = new Set();
      defaultSections.forEach((sectionKey) => {
        getDashboardSectionCharts(sectionKey).forEach((chart) => {
          allCharts.add(chart.key);
        });
      });
      setSelectedCharts(allCharts);
      setTempSelectedCharts(allCharts);
    }
  };

  const loadPublicKPISelections = async () => {
    if (!selectedBrandId) return;
    
    try {
      const data = await reportingAPI.getKPISelections(selectedBrandId);
      console.log("Loaded public KPI selections:", data);
      if (data) {
        // Load public KPI selections
        if (data.selected_kpis && data.selected_kpis.length > 0) {
          setPublicKPISelections(new Set(data.selected_kpis));
        } else {
          // If no selections saved, show all available KPIs
          setPublicKPISelections(null);
        }
        
        // Load public section visibility
        if (data.visible_sections && data.visible_sections.length > 0) {
          const sectionsSet = new Set(data.visible_sections);
          console.log("Setting publicVisibleSections:", Array.from(sectionsSet));
          setPublicVisibleSections(sectionsSet);
        } else {
          // If no selections saved, show all sections
          console.log("No visible_sections in data, setting to null (show all)");
          setPublicVisibleSections(null);
        }
      }
    } catch (err) {
      console.error("Error loading public KPI selections:", err);
      // On error, show all KPIs and sections
      setPublicKPISelections(null);
      setPublicVisibleSections(null);
    }
  };

  // Comprehensive data loading function - loads all dashboard data including KPI selections
  const loadAllData = async () => {
    if (!selectedBrandId) return;
    
    // Load all data sources in parallel
    await Promise.all([
      loadDashboardData(),
      loadScrunchData(),
      !isPublic ? loadBrandAnalytics() : Promise.resolve(),
      !isPublic ? loadKPISelections() : loadPublicKPISelections(),
    ]);
  };

  useEffect(() => {
    if (isPublic && publicSlug) {
      // For public mode, fetch brand by slug and set selectedBrandId
      const fetchPublicBrand = async () => {
        try {
          const brand = await reportingAPI.getBrandBySlug(publicSlug);
          setSelectedBrandId(brand.id);
        } catch (err) {
          setError(err.response?.data?.detail || "Failed to load brand");
        }
      };
      fetchPublicBrand();
    } else {
      loadBrands();
    }
  }, [isPublic, publicSlug]);

  useEffect(() => {
    if (selectedBrandId) {
      // Clear previous data when switching brands
      setDashboardData(null);
      setScrunchData(null);
      setBrandAnalytics(null);
      setError(null);
      // Reset pagination when data changes
      setInsightsPage(0);
      // Load all data sources in parallel including KPI selections
      loadAllData();
    }
  }, [selectedBrandId, startDate, endDate, isPublic]);

  const loadBrands = async () => {
    try {
      const data = await syncAPI.getBrands();
      const brandsList = data.items || [];
      console.log(
        "Loaded brands:",
        brandsList.map((b) => ({ id: b.id, name: b.name, slug: b.slug }))
      );
      setBrands(brandsList);
      if (brandsList.length > 0) {
        setSelectedBrandId(brandsList[0].id);
        // Set slug for first brand
        if (brandsList[0].slug) {
          setSelectedBrandSlug(brandsList[0].slug);
        }
      }
    } catch (err) {
      console.error("Error loading brands:", err);
      setError(err.response?.data?.detail || "Failed to load brands");
    }
  };

  // Update slug when brand changes
  useEffect(() => {
    if (selectedBrandId && brands.length > 0) {
      const selectedBrand = brands.find((b) => b.id === selectedBrandId);
      if (selectedBrand?.slug) {
        setSelectedBrandSlug(selectedBrand.slug);
      } else {
        setSelectedBrandSlug(null);
      }
    }
  }, [selectedBrandId, brands]);

  const handleOpenShareDialog = () => {
    if (selectedBrandSlug) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/reporting/${selectedBrandSlug}`;
      setShareableUrl(url);
      setShowShareDialog(true);
      setCopied(false);
    } else {
      setError(
        "Brand slug not available. Please ensure the brand has a slug configured."
      );
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      setError("Failed to copy URL to clipboard");
    }
  };

  const loadDashboardData = async () => {
    if (!selectedBrandId && !publicSlug) return;

    try {
      setLoading(true);
      setError(null);

      let data;
      if (isPublic && publicSlug) {
        data = await reportingAPI.getReportingDashboardBySlug(
          publicSlug,
          startDate || undefined,
          endDate || undefined
        );
      } else {
        data = await reportingAPI.getReportingDashboard(
          selectedBrandId,
          startDate || undefined,
          endDate || undefined
        );
      }

      // Check if data is valid and has content
      if (data && (data.kpis || data.chart_data || data.diagnostics)) {
        const scrunchKPIs = data.kpis ? Object.keys(data.kpis).filter(k => data.kpis[k]?.source === "Scrunch") : [];
        console.log(`Dashboard data loaded for brand ${selectedBrandId}:`, {
          hasKPIs: !!data.kpis,
          kpiCount: data.kpis ? Object.keys(data.kpis).length : 0,
          scrunchKPICount: scrunchKPIs.length,
          scrunchKPIs: scrunchKPIs,
          hasChartData: !!data.chart_data,
          hasDiagnostics: !!data.diagnostics,
          availableSources: data.available_sources,
          diagnostics: data.diagnostics,
        });
        setDashboardData(data);

        // Initialize selected KPIs with all available KPIs if not already loaded from database
        // (This is a fallback - loadKPISelections effect should handle this)
        if (selectedKPIs.size === 0 && data.kpis && !isPublic) {
          const availableKPIs = Object.keys(data.kpis).filter(k => KPI_ORDER.includes(k));
          if (availableKPIs.length > 0) {
            setSelectedKPIs(new Set(availableKPIs));
            setTempSelectedKPIs(new Set(availableKPIs));
          }
        }
      } else {
        // No data available for this brand
        console.warn(`No data available for brand ${selectedBrandId}`);
        setDashboardData(null);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setDashboardData(null);
      // Don't set error here - let individual sections handle their own errors
    } finally {
      setLoading(false);
    }
  };

  const loadScrunchData = async () => {
    if (!selectedBrandId || isPublic) return; // Skip for public mode (use main endpoint)

    try {
      setLoadingScrunch(true);
      const data = await reportingAPI.getScrunchDashboard(
        selectedBrandId,
        startDate || undefined,
        endDate || undefined
      );

      // Set scrunchData if we have KPIs or chart data, regardless of 'available' flag
      if (data && (data.kpis || data.chart_data)) {
        const hasKPIs = data.kpis && Object.keys(data.kpis).length > 0;
        const hasChartData =
          data.chart_data &&
          ((data.chart_data.top_performing_prompts &&
            data.chart_data.top_performing_prompts.length > 0) ||
            (data.chart_data.scrunch_ai_insights &&
              data.chart_data.scrunch_ai_insights.length > 0));

        console.log(`Scrunch data loaded for brand ${selectedBrandId}:`, {
          hasKPIs,
          kpiCount: data.kpis ? Object.keys(data.kpis).length : 0,
          hasChartData,
        });

        if (hasKPIs || hasChartData) {
          setScrunchData(data);
        } else {
          setScrunchData(null);
        }
      } else {
        setScrunchData(null);
      }
    } catch (err) {
      console.error("Error loading Scrunch data:", err);
      setScrunchData(null);
      // Don't set error - Scrunch section will handle its own display
    } finally {
      setLoadingScrunch(false);
    }
  };

  const loadBrandAnalytics = async () => {
    if (!selectedBrandId) return;

    try {
      setLoadingAnalytics(true);
      const response = await syncAPI.getBrandAnalytics(selectedBrandId);
      setBrandAnalytics(response.global_analytics || null);
    } catch (err) {
      console.error("Failed to load brand analytics:", err);
      setBrandAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const formatValue = (kpi) => {
    const { value, format, display } = kpi;

    // If custom format with display text, use that
    if (format === "custom" && display) {
      return display;
    }

    // Handle custom format with object values
    if (format === "custom" && typeof value === "object" && value !== null) {
      // For competitive_benchmarking
      if (
        value.brand_visibility_percent !== undefined &&
        value.competitor_avg_visibility_percent !== undefined
      ) {
        return `Your brand's AI visibility: ${value.brand_visibility_percent.toFixed(
          1
        )}% vs competitor average: ${value.competitor_avg_visibility_percent.toFixed(
          1
        )}%`;
      }
      // For keyword_ranking_change_and_volume
      if (
        value.avg_ranking_change !== undefined &&
        value.total_search_volume !== undefined
      ) {
        return `Ranking change: ${
          value.avg_ranking_change
        } positions | Search volume: ${value.total_search_volume.toLocaleString()}`;
      }
      // For all_keywords_ranking (array of keywords)
      if (Array.isArray(value)) {
        return `${value.length} keywords tracked`;
      }
      // For null values (prompt_volume, citations_per_prompt)
      if (value === null) {
        return "Metric not available - no assumptions made";
      }
    }

    // Handle null values
    if (value === null || value === undefined) {
      return "Metric not available - no assumptions made";
    }

    if (format === "currency") {
      return `$${value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    }

    if (format === "percentage") {
      return `${value.toFixed(1)}%`;
    }

    if (format === "duration") {
      // Convert seconds to readable format (MM:SS or HH:MM:SS)
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      const seconds = Math.floor(value % 60);

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`;
      } else {
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      }
    }

    if (format === "number") {
      return value.toLocaleString();
    }

    return value.toLocaleString();
  };

  // Helper function to get simplified channel label
  const getChannelLabel = (source) => {
    if (!source) return source;
    const sourceLower = source.toLowerCase();

    if (sourceLower.includes("direct") || sourceLower.includes("(none)")) {
      return "Direct";
    } else if (sourceLower.includes("organic")) {
      return "Organic";
    } else if (
      sourceLower.includes("social") ||
      sourceLower.includes("paid_social") ||
      sourceLower.includes("facebook")
    ) {
      return "Social";
    } else if (
      sourceLower.includes("referral") ||
      sourceLower.includes("refer") ||
      sourceLower.includes("cpc")
    ) {
      return "Referral";
    }
    // Return original if no match
    return source;
  };

  // Helper function to get channel color
  const getChannelColor = (source) => {
    if (!source) return "rgba(59, 130, 246, 0.6)";
    const sourceLower = source.toLowerCase();

    if (sourceLower.includes("direct") || sourceLower.includes("(none)")) {
      return "rgba(20, 184, 166, 0.6)"; // Teal/Green for Direct
    } else if (
      sourceLower.includes("google") &&
      sourceLower.includes("organic")
    ) {
      return "rgba(59, 130, 246, 0.6)"; // Light blue for Google Organic
    } else if (
      sourceLower.includes("google") &&
      (sourceLower.includes("cpc") || sourceLower.includes("paid"))
    ) {
      return "rgba(68, 192, 237, 0.6)"; // Light blue for Google CPC
    } else if (
      sourceLower.includes("facebook") ||
      sourceLower.includes("social") ||
      sourceLower.includes("paid_social")
    ) {
      return "rgba(239, 68, 68, 0.6)"; // Orange-red for Social/Paid Social
    } else if (
      sourceLower.includes("referral") ||
      sourceLower.includes("refer")
    ) {
      return "rgba(251, 146, 60, 0.6)"; // Orange for Referral
    } else if (
      sourceLower.includes("organic") ||
      sourceLower.includes("search")
    ) {
      return "rgba(59, 130, 246, 0.6)"; // Light blue for Organic Search
    }
    // Default color
    return "rgba(59, 130, 246, 0.6)";
  };

  const getSourceColor = (source) => {
    switch (source) {
      case "GA4":
        return "#4285F4"; // Google blue
      case "AgencyAnalytics":
        return "#34A853"; // Google green
      case "Scrunch":
        return "#FBBC04"; // Google yellow
      default:
        return theme.palette.grey[500];
    }
  };

  const getSourceLabel = (source) => {
    switch (source) {
      case "GA4":
        return "Google Analytics";
      case "AgencyAnalytics":
        return "Agency Analytics";
      case "Scrunch":
        return "Scrunch AI";
      default:
        return source;
    }
  };

  const handleDatePresetChange = (preset) => {
    if (preset === "") {
      setDatePreset("");
      return;
    }

    const presetData = DATE_PRESETS.find((p) => p.label === preset);
    if (presetData) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - presetData.days);

      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
      setDatePreset(preset);
    }
  };

  // Get current date range label for charts
  const getDateRangeLabel = () => {
    if (datePreset) {
      return datePreset;
    }
    // Calculate days from startDate to endDate
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return `Last ${days} days`;
    }
    return "Last 7 days"; // Default fallback
  };

  const handleKPIChange = (kpiKey, checked) => {
    const newSelected = new Set(tempSelectedKPIs);
    if (checked) {
      newSelected.add(kpiKey);
    } else {
      newSelected.delete(kpiKey);
    }
    setTempSelectedKPIs(newSelected);
  };

  // Helper function to get KPIs for a section (for Performance Metrics)
  const getSectionKPIs = (sectionKey) => {
    switch (sectionKey) {
      case "GA4":
        return KPI_ORDER.filter((key) => {
          const metadata = KPI_METADATA[key];
          return metadata && metadata.source === "GA4";
        });
      case "AgencyAnalytics":
        return KPI_ORDER.filter((key) => {
          const metadata = KPI_METADATA[key];
          return metadata && metadata.source === "AgencyAnalytics";
        });
      case "Scrunch":
        return KPI_ORDER.filter((key) => {
          const metadata = KPI_METADATA[key];
          return metadata && metadata.source === "Scrunch";
        });
      case "AdvancedAnalytics":
        // Advanced Analytics Query might not have specific KPIs, return empty for now
        // Or you can add specific KPIs if needed
        return [];
      default:
        return [];
    }
  };

  // Helper function to get KPIs displayed in each dashboard section
  const getDashboardSectionKPIs = (sectionKey) => {
    switch (sectionKey) {
      case "ga4":
        // GA4 section shows GA4 KPIs
        return KPI_ORDER.filter((key) => {
          const metadata = KPI_METADATA[key];
          return metadata && metadata.source === "GA4";
        });
      case "agency_analytics":
        // Agency Analytics section shows AgencyAnalytics KPIs
        // Note: These are displayed as charts within GA4 section, but tracked separately
        return KPI_ORDER.filter((key) => {
          const metadata = KPI_METADATA[key];
          return metadata && metadata.source === "AgencyAnalytics";
        });
      case "scrunch_ai":
        // Scrunch AI section shows Scrunch KPIs
        return KPI_ORDER.filter((key) => {
          const metadata = KPI_METADATA[key];
          return metadata && metadata.source === "Scrunch";
        });
      case "brand_analytics":
        // Brand Analytics section doesn't show individual KPIs, just charts
        return [];
      case "advanced_analytics":
        // Advanced Analytics Query section doesn't show individual KPIs
        return [];
      default:
        return [];
    }
  };

  // Helper function to get charts/visualizations for each dashboard section
  const getDashboardSectionCharts = (sectionKey) => {
    switch (sectionKey) {
      case "ga4":
        return [
          { key: "ga4_traffic_overview", label: "Traffic Overview", description: "Overall traffic metrics" },
          { key: "ga4_daily_comparison", label: "Daily Comparison", description: "Daily users, sessions, and conversions" },
          { key: "ga4_channel_performance", label: "Channel Performance", description: "Traffic by marketing channel" },
          { key: "ga4_device_category", label: "Device Category", description: "Traffic by device type" },
          { key: "ga4_landing_pages", label: "Top Landing Pages", description: "Most visited pages" },
        ];
      case "agency_analytics":
        return [
          { key: "all_keywords_ranking", label: "Top Keywords Ranking", description: "SEO keyword rankings" },
        ];
      case "scrunch_ai":
        return [
          { key: "top_performing_prompts", label: "Top Performing Prompts", description: "Best performing AI prompts" },
          { key: "scrunch_ai_insights", label: "Scrunch AI Insights", description: "AI-generated insights and recommendations" },
        ];
      case "brand_analytics":
        return [
          { key: "brand_analytics_charts", label: "Brand Analytics Charts", description: "Platform distribution, funnel stages, and sentiment" },
        ];
      case "advanced_analytics":
        return [
          { key: "scrunch_visualizations", label: "Advanced Query Visualizations", description: "Query API-based visualizations" },
        ];
      default:
        return [];
    }
  };

  // Helper functions for dashboard sections (similar to Performance Metrics)
  const areAllDashboardSectionKPIsSelected = (sectionKey) => {
    const sectionKPIs = getDashboardSectionKPIs(sectionKey);
    if (sectionKPIs.length === 0) return false;
    return sectionKPIs.every((kpi) => tempSelectedKPIs.has(kpi));
  };

  const areSomeDashboardSectionKPIsSelected = (sectionKey) => {
    const sectionKPIs = getDashboardSectionKPIs(sectionKey);
    if (sectionKPIs.length === 0) return false;
    const selectedCount = sectionKPIs.filter((kpi) => tempSelectedKPIs.has(kpi)).length;
    return selectedCount > 0 && selectedCount < sectionKPIs.length;
  };

  const handleDashboardSectionKPIsChange = (sectionKey, checked) => {
    const sectionKPIs = getDashboardSectionKPIs(sectionKey);
    const newSelected = new Set(tempSelectedKPIs);
    
    if (checked) {
      sectionKPIs.forEach((kpi) => {
        newSelected.add(kpi);
      });
    } else {
      sectionKPIs.forEach((kpi) => {
        newSelected.delete(kpi);
      });
    }
    
    setTempSelectedKPIs(newSelected);
  };

  // Helper function to check if all KPIs in a section are selected
  const areAllSectionKPIsSelected = (sectionKey) => {
    const sectionKPIs = getSectionKPIs(sectionKey);
    if (sectionKPIs.length === 0) return false;
    return sectionKPIs.every((kpi) => tempSelectedKPIs.has(kpi));
  };

  // Helper function to check if some KPIs in a section are selected (indeterminate state)
  const areSomeSectionKPIsSelected = (sectionKey) => {
    const sectionKPIs = getSectionKPIs(sectionKey);
    if (sectionKPIs.length === 0) return false;
    const selectedCount = sectionKPIs.filter((kpi) => tempSelectedKPIs.has(kpi)).length;
    return selectedCount > 0 && selectedCount < sectionKPIs.length;
  };

  // Handle parent section checkbox change
  const handleSectionKPIsChange = (sectionKey, checked) => {
    const sectionKPIs = getSectionKPIs(sectionKey);
    const newSelected = new Set(tempSelectedKPIs);
    
    if (checked) {
      // Select all KPIs in this section
      sectionKPIs.forEach((kpi) => {
        newSelected.add(kpi);
      });
    } else {
      // Deselect all KPIs in this section
      sectionKPIs.forEach((kpi) => {
        newSelected.delete(kpi);
      });
    }
    
    setTempSelectedKPIs(newSelected);
  };

  // Handle accordion expand/collapse
  const handleAccordionChange = (sectionKey) => (event, isExpanded) => {
    const newExpanded = new Set(expandedSections);
    if (isExpanded) {
      newExpanded.add(sectionKey);
    } else {
      newExpanded.delete(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const handleSelectAll = () => {
    // Select all available KPIs
    const availableKPIs = dashboardData?.kpis
      ? Object.keys(dashboardData.kpis)
      : KPI_ORDER;
    setTempSelectedKPIs(new Set(availableKPIs));
  };

  const handleDeselectAll = () => {
    setTempSelectedKPIs(new Set());
  };

  const handleSaveKPISelection = async () => {
    if (!selectedBrandId) return;
    
    try {
      // Save to database (KPIs, sections, and charts)
      await reportingAPI.saveKPISelections(selectedBrandId, tempSelectedKPIs, Array.from(tempVisibleSections));
      setSelectedKPIs(new Set(tempSelectedKPIs));
      setVisibleSections(new Set(tempVisibleSections));
      setSelectedCharts(new Set(tempSelectedCharts));
      setShowKPISelector(false);
      console.log("KPI, section, and chart selections saved successfully");
    } catch (err) {
      console.error("Error saving KPI selections:", err);
      setError("Failed to save KPI and section selections. Please try again.");
    }
  };

  const handleOpenKPISelector = () => {
    // Initialize temp selection with current selection
    setTempSelectedKPIs(new Set(selectedKPIs));
    setTempVisibleSections(new Set(visibleSections));
    setTempSelectedCharts(new Set(selectedCharts));
    // Expand all sections by default
    setExpandedSections(new Set(["ga4", "agency_analytics", "scrunch_ai", "brand_analytics", "advanced_analytics"]));
    setShowKPISelector(true);
  };

  // Helper function to check if a section should be visible
  const isSectionVisible = (sectionKey) => {
    if (isPublic) {
      // In public mode, use publicVisibleSections
      if (publicVisibleSections === null) {
        return true; // Show all if no selections saved
      }
      return publicVisibleSections.has(sectionKey);
    } else {
      // In authenticated mode, always show (managers can see everything)
      return true;
    }
  };

  const handleSectionChange = (sectionKey, checked) => {
    const newSections = new Set(tempVisibleSections);
    const newSelectedKPIs = new Set(tempSelectedKPIs);
    const newSelectedCharts = new Set(tempSelectedCharts);
    
    // Get all KPIs and charts for this section
    const sectionKPIs = getDashboardSectionKPIs(sectionKey);
    const sectionCharts = getDashboardSectionCharts(sectionKey);
    
    if (checked) {
      // Enable section and all its children (KPIs + charts)
      newSections.add(sectionKey);
      sectionKPIs.forEach((kpi) => newSelectedKPIs.add(kpi));
      sectionCharts.forEach((chart) => newSelectedCharts.add(chart.key));
    } else {
      // Disable section and all its children (KPIs + charts)
      newSections.delete(sectionKey);
      sectionKPIs.forEach((kpi) => newSelectedKPIs.delete(kpi));
      sectionCharts.forEach((chart) => newSelectedCharts.delete(chart.key));
    }
    
    setTempVisibleSections(newSections);
    setTempSelectedKPIs(newSelectedKPIs);
    setTempSelectedCharts(newSelectedCharts);
  };

  const handleSelectAllSections = () => {
    const allSections = new Set(["ga4", "agency_analytics", "scrunch_ai", "brand_analytics", "advanced_analytics"]);
    const allKPIs = new Set(KPI_ORDER);
    const allCharts = new Set();
    
    // Get all charts from all sections
    allSections.forEach((sectionKey) => {
      getDashboardSectionCharts(sectionKey).forEach((chart) => {
        allCharts.add(chart.key);
      });
    });
    
    setTempVisibleSections(allSections);
    setTempSelectedKPIs(allKPIs);
    setTempSelectedCharts(allCharts);
  };

  const handleDeselectAllSections = () => {
    setTempVisibleSections(new Set());
    setTempSelectedKPIs(new Set());
    setTempSelectedCharts(new Set());
  };

  // Get KPIs in the correct order, filtered by selection
  // Merge scrunchData KPIs with dashboardData KPIs for display
  // In public mode, show all KPIs; otherwise filter by selection
  const allKPIs = {
    ...(dashboardData?.kpis || {}),
    ...(scrunchData?.kpis || {}), // scrunchData KPIs take precedence
  };

  const displayedKPIs =
    Object.keys(allKPIs).length > 0
      ? isPublic
        ? // In public mode, use saved selections from database (or show all if none saved)
          (publicKPISelections === null
            ? KPI_ORDER.filter((key) => allKPIs[key]) // Show all if no selections saved
            : KPI_ORDER.filter(
                (key) => allKPIs[key] && publicKPISelections.has(key)
              )
          ).map((key) => [key, allKPIs[key]])
        : // In authenticated mode, use user's current selection
          KPI_ORDER.filter(
            (key) =>
              allKPIs[key] &&
              selectedKPIs.has(key) &&
              key !== "competitive_benchmarking"
          ).map((key) => [key, allKPIs[key]])
      : [];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box mb={4}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Box display="flex" alignItems="center" gap={2}>
            {/* Show brand logo in public mode */}
            {isPublic && publicBrandInfo?.logo_url && (
              <Box
                component="img"
                src={publicBrandInfo.logo_url}
                alt={`${publicBrandInfo.name} logo`}
                sx={{
                  maxHeight: 56,
                  maxWidth: 240,
                  height: 'auto',
                  width: 'auto',
                  objectFit: 'contain',
                  borderRadius: 1,
                }}
              />
            )}
            {/* Show brand name only if no logo, or show both if logo exists */}
            {(!isPublic || !publicBrandInfo?.logo_url) && (
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  fontSize: "1.75rem",
                  letterSpacing: "-0.02em",
                  color: "text.primary",
                }}
              >
                {isPublic && publicBrandInfo
                  ? publicBrandInfo.name
                  : "Unified Reporting Dashboard"}
              </Typography>
            )}
          </Box>
          <Box display="flex" gap={1.5}>
            {!isPublic && (
              <IconButton
                onClick={handleOpenKPISelector}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
                title="Configure KPIs for Public View"
              >
                <SettingsIcon sx={{ fontSize: 20 }} />
              </IconButton>
            )}
            {!isPublic && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ShareIcon sx={{ fontSize: 16 }} />}
                onClick={handleOpenShareDialog}
                disabled={!selectedBrandSlug}
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 0.75,
                  fontWeight: 600,
                  bgcolor: "background.paper",
                }}
                title={
                  selectedBrandSlug
                    ? "Share public dashboard URL"
                    : "Brand slug not configured"
                }
              >
                Share
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
              onClick={loadAllData}
              sx={{
                borderRadius: 2,
                px: 2,
                py: 0.75,
                fontWeight: 600,
                bgcolor: "background.paper",
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          {!isPublic && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select Brand</InputLabel>
              <Select
                value={selectedBrandId || ""}
                label="Select Brand"
                onChange={(e) => {
                  const brandId = e.target.value;
                  setSelectedBrandId(brandId);
                  // Update slug when brand changes
                  const selectedBrand = brands.find((b) => b.id === brandId);
                  if (selectedBrand?.slug) {
                    setSelectedBrandSlug(selectedBrand.slug);
                  } else {
                    setSelectedBrandSlug(null);
                  }
                }}
              >
                {brands.map((brand) => (
                  <MenuItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box display="flex" alignItems="center" gap={1}>
            <CalendarTodayIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={datePreset}
                label="Date Range"
                onChange={(e) => handleDatePresetChange(e.target.value)}
              >
                <MenuItem value="">Custom Range</MenuItem>
                {DATE_PRESETS.map((preset) => (
                  <MenuItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate || ""}
            onChange={(e) => {
              setStartDate(e.target.value);
              setDatePreset(""); // Clear preset when manually selecting dates
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />

          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate || ""}
            onChange={(e) => {
              setEndDate(e.target.value);
              setDatePreset(""); // Clear preset when manually selecting dates
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
        </Paper>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Diagnostic Information */}
      {dashboardData?.diagnostics && (
        <Box mb={3}>
          {(!dashboardData.diagnostics.ga4_configured ||
            !dashboardData.diagnostics.agency_analytics_configured) && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Missing Data Sources
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {!dashboardData.diagnostics.ga4_configured && (
                  <li>
                    <Typography variant="body2">
                      <strong>GA4:</strong> No GA4 property ID configured.
                      Configure it in the brands table or use the GA4 sync
                      endpoint.
                    </Typography>
                  </li>
                )}
                {!dashboardData.diagnostics.agency_analytics_configured && (
                  <li>
                    <Typography variant="body2">
                      <strong>AgencyAnalytics:</strong> No campaigns linked to
                      this brand. Sync Agency Analytics data and link campaigns
                      to brands.
                    </Typography>
                  </li>
                )}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                mt={1}
                display="block"
              >
                Currently showing: {dashboardData.diagnostics.kpi_counts.ga4}{" "}
                GA4 KPIs,{" "}
                {dashboardData.diagnostics.kpi_counts.agency_analytics}{" "}
                AgencyAnalytics KPIs,{" "}
                {dashboardData.diagnostics.kpi_counts.scrunch} Scrunch KPIs
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress size={40} thickness={4} />
        </Box>
      ) : dashboardData ? (
        <>
          {/* Google Analytics 4 Section */}
          {isSectionVisible("ga4") && (dashboardData?.kpis?.users ||
            dashboardData?.chart_data?.ga4_traffic_overview) && (
            <SectionContainer
              title="Google Analytics 4"
              description="Website traffic and engagement metrics"
              loading={loading}
            >

              {/* GA4 Charts and Visualizations */}
              <Box sx={{ mb: 4 }}>
                {/* <Typography 
                  variant="h6" 
                  fontWeight={600} 
                  mb={3}
                  sx={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}
                >
                  Charts & Visualizations
                </Typography> */}

                {/* Performance Metrics - Donut Charts */}
                <Typography
                  variant="h6"
                  fontWeight={600}
                  mb={2}
                  sx={{ fontSize: "1.125rem", letterSpacing: "-0.01em" }}
                >
                  Performance Metrics
                </Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {/* Bounce Rate Donut */}
                  {dashboardData?.kpis?.bounce_rate && (
                    <Grid item xs={12} sm={6} md={3}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <Card
                          sx={{
                            background: "#FFFFFF",
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 2,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            },
                          }}
                        >
                          <CardContent sx={{ p: 2.5 }}>
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              mb={1.5}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: "0.875rem", fontWeight: 500 }}
                              >
                                Active users
                              </Typography>
                              <IconButton size="small" sx={{ p: 0.5 }}>
                                <TrendingUpIcon
                                  sx={{ fontSize: 16, color: "text.secondary" }}
                                />
                              </IconButton>
                            </Box>
                            <Typography
                              variant="h4"
                              fontWeight={700}
                              sx={{
                                fontSize: "1.75rem",
                                letterSpacing: "-0.02em",
                                mb: 1,
                                color: "text.primary",
                              }}
                            >
                              {(() => {
                                const value =
                                  dashboardData.kpis.users.value || 0;
                                if (value >= 1000) {
                                  return `${(value / 1000).toFixed(1)}K`;
                                }
                                return value.toLocaleString();
                              })()}
                            </Typography>
                            <Box
                              sx={{
                                minHeight: '24px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {dashboardData.kpis.users.change !== undefined &&
                                dashboardData.kpis.users.change !== null &&
                                dashboardData.kpis.users.change >= 0 && (
                                  <Box
                                    display="flex"
                                    alignItems="center"
                                    gap={0.5}
                                  >
                                    <TrendingUpIcon
                                      sx={{ fontSize: 14, color: "#34A853" }}
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontSize: "0.875rem",
                                        fontWeight: 600,
                                        color: "#34A853",
                                      }}
                                    >
                                      {Math.abs(
                                        dashboardData.kpis.users.change
                                      ).toFixed(1)}
                                      %
                                    </Typography>
                                  </Box>
                                )}
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  )}

                  {/* Sessions */}
                  {dashboardData?.kpis?.sessions && (
                    <Grid item xs={12} sm={6} md={3}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                      >
                        <Card
                          sx={{
                            background: "#FFFFFF",
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 2,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            },
                          }}
                        >
                          <CardContent sx={{ p: 2.5 }}>
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              mb={1.5}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: "0.875rem", fontWeight: 500 }}
                              >
                                Sessions
                              </Typography>
                              <IconButton size="small" sx={{ p: 0.5 }}>
                                <BarChartIcon
                                  sx={{ fontSize: 16, color: "text.secondary" }}
                                />
                              </IconButton>
                            </Box>
                            <Typography
                              variant="h4"
                              fontWeight={700}
                              sx={{
                                fontSize: "1.75rem",
                                letterSpacing: "-0.02em",
                                mb: 1,
                                color: "text.primary",
                              }}
                            >
                              {(() => {
                                const value =
                                  dashboardData.kpis.sessions.value || 0;
                                if (value >= 1000) {
                                  return `${(value / 1000).toFixed(1)}K`;
                                }
                                return value.toLocaleString();
                              })()}
                            </Typography>
                            <Box
                              sx={{
                                minHeight: '24px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {dashboardData.kpis.sessions.change !== undefined &&
                                dashboardData.kpis.sessions.change !== null &&
                                dashboardData.kpis.sessions.change >= 0 && (
                                  <Box
                                    display="flex"
                                    alignItems="center"
                                    gap={0.5}
                                  >
                                    <TrendingUpIcon
                                      sx={{ fontSize: 14, color: "#34A853" }}
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontSize: "0.875rem",
                                        fontWeight: 600,
                                        color: "#34A853",
                                      }}
                                    >
                                      {Math.abs(
                                        dashboardData.kpis.sessions.change
                                      ).toFixed(1)}
                                      %
                                    </Typography>
                                  </Box>
                                )}
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  )}

                  {/* New Users */}
                  {dashboardData?.kpis?.new_users && (
                    <Grid item xs={12} sm={6} md={3}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        <Card
                          sx={{
                            background: "#FFFFFF",
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 2,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            },
                          }}
                        >
                          <CardContent sx={{ p: 2.5 }}>
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              mb={1.5}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: "0.875rem", fontWeight: 500 }}
                              >
                                New users
                              </Typography>
                              <IconButton size="small" sx={{ p: 0.5 }}>
                                <PersonAddIcon
                                  sx={{ fontSize: 16, color: "text.secondary" }}
                                />
                              </IconButton>
                            </Box>
                            <Typography
                              variant="h4"
                              fontWeight={700}
                              sx={{
                                fontSize: "1.75rem",
                                letterSpacing: "-0.02em",
                                mb: 1,
                                color: "text.primary",
                              }}
                            >
                              {(() => {
                                const value =
                                  dashboardData.kpis.new_users.value || 0;
                                if (value >= 1000) {
                                  return `${(value / 1000).toFixed(1)}K`;
                                }
                                return value.toLocaleString();
                              })()}
                            </Typography>
                            <Box
                              sx={{
                                minHeight: '24px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {dashboardData.kpis.new_users.change !==
                                undefined &&
                                dashboardData.kpis.new_users.change !== null &&
                                dashboardData.kpis.new_users.change >= 0 && (
                                  <Box
                                    display="flex"
                                    alignItems="center"
                                    gap={0.5}
                                  >
                                    <TrendingUpIcon
                                      sx={{ fontSize: 14, color: "#34A853" }}
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontSize: "0.875rem",
                                        fontWeight: 600,
                                        color: "#34A853",
                                      }}
                                    >
                                      {Math.abs(
                                        dashboardData.kpis.new_users.change
                                      ).toFixed(1)}
                                      %
                                    </Typography>
                                  </Box>
                                )}
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  )}

                  {/* Conversions or Revenue */}
                  {(dashboardData?.kpis?.conversions ||
                    dashboardData?.kpis?.revenue) && (
                    <Grid item xs={12} sm={6} md={3}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.25 }}
                      >
                        <Card
                          sx={{
                            background: "#FFFFFF",
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 2,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            },
                          }}
                        >
                          <CardContent sx={{ p: 2.5 }}>
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              mb={1.5}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: "0.875rem", fontWeight: 500 }}
                              >
                                {dashboardData.kpis.conversions
                                  ? "Conversions"
                                  : "Revenue"}
                              </Typography>
                              <IconButton size="small" sx={{ p: 0.5 }}>
                                <TrendingUpIcon
                                  sx={{ fontSize: 16, color: "text.secondary" }}
                                />
                              </IconButton>
                            </Box>
                            <Typography
                              variant="h4"
                              fontWeight={700}
                              sx={{
                                fontSize: "1.75rem",
                                letterSpacing: "-0.02em",
                                mb: 1,
                                color: "text.primary",
                              }}
                            >
                              {(() => {
                                const kpi =
                                  dashboardData.kpis.conversions ||
                                  dashboardData.kpis.revenue;
                                const value = kpi.value || 0;
                                if (dashboardData.kpis.revenue) {
                                  return `${value.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })}`;
                                }
                                if (value >= 1000) {
                                  return `${(value / 1000).toFixed(1)}K`;
                                }
                                return value.toLocaleString();
                              })()}
                            </Typography>
                            <Box
                              sx={{
                                minHeight: '24px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {(() => {
                                const kpi =
                                  dashboardData.kpis.conversions ||
                                  dashboardData.kpis.revenue;
                                return (
                                  kpi.change !== undefined &&
                                  kpi.change !== null &&
                                  kpi.change >= 0 && (
                                    <Box
                                      display="flex"
                                      alignItems="center"
                                      gap={0.5}
                                    >
                                      <TrendingUpIcon
                                        sx={{ fontSize: 14, color: "#34A853" }}
                                      />
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontSize: "0.875rem",
                                          fontWeight: 600,
                                          color: "#34A853",
                                        }}
                                      >
                                        {Math.abs(kpi.change).toFixed(1)}%
                                      </Typography>
                                    </Box>
                                  )
                                );
                              })()}
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  )}
                </Grid>

                {/* GA4 Traffic Overview Cards - Additional Metrics */}
                {dashboardData?.chart_data?.ga4_traffic_overview && (
                  <Grid container spacing={2.5} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={3}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                      >
                        <Card
                          sx={{
                            background:
                              "linear-gradient(135deg, rgba(52, 199, 89, 0.04) 0%, rgba(90, 200, 250, 0.04) 100%)",
                            border: `1px solid ${alpha(
                              theme.palette.success.main,
                              0.08
                            )}`,
                            borderRadius: 2,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              mb={2}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Total Sessions
                              </Typography>
                              <BarChartIcon
                                sx={{
                                  fontSize: 20,
                                  color: "success.main",
                                  opacity: 0.6,
                                }}
                              />
                            </Box>
                            <Typography
                              variant="h3"
                              fontWeight={700}
                              color="success.main"
                              sx={{
                                fontSize: "36px",
                                letterSpacing: "-0.02em",
                                mb: 1,
                              }}
                            >
                              {dashboardData.chart_data.ga4_traffic_overview.sessions.toLocaleString()}
                            </Typography>
                            <Box
                              sx={{
                                minHeight: '24px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {dashboardData.chart_data.ga4_traffic_overview
                                .sessionsChange >= 0 && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <TrendingUpIcon
                                    sx={{ fontSize: 14, color: "success.main" }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "success.main",
                                    }}
                                  >
                                    {Math.abs(
                                      dashboardData.chart_data.ga4_traffic_overview
                                        .sessionsChange
                                    ).toFixed(1)}
                                    %
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: "12px" }}
                                  >
                                    vs last period
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                      >
                        <Card
                          sx={{
                            background:
                              "linear-gradient(135deg, rgba(0, 122, 255, 0.04) 0%, rgba(88, 86, 214, 0.04) 100%)",
                            border: `1px solid ${alpha(
                              theme.palette.primary.main,
                              0.08
                            )}`,
                            borderRadius: 2,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              mb={2}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Engaged Sessions
                              </Typography>
                              <PeopleIcon
                                sx={{
                                  fontSize: 20,
                                  color: "primary.main",
                                  opacity: 0.6,
                                }}
                              />
                            </Box>
                            <Typography
                              variant="h3"
                              fontWeight={700}
                              sx={{
                                fontSize: "36px",
                                letterSpacing: "-0.02em",
                                mb: 1,
                              }}
                            >
                              {dashboardData.chart_data.ga4_traffic_overview.engagedSessions.toLocaleString()}
                            </Typography>
                            <Box
                              sx={{
                                minHeight: '24px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {dashboardData.chart_data.ga4_traffic_overview
                                .engagedSessionsChange >= 0 && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <TrendingUpIcon
                                    sx={{ fontSize: 14, color: "success.main" }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "success.main",
                                    }}
                                  >
                                    {Math.abs(
                                      dashboardData.chart_data.ga4_traffic_overview
                                        .engagedSessionsChange
                                    ).toFixed(1)}
                                    %
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: "12px" }}
                                  >
                                    vs last period
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                      >
                        <Card
                          sx={{
                            background:
                              "linear-gradient(135deg, rgba(255, 149, 0, 0.04) 0%, rgba(255, 45, 85, 0.04) 100%)",
                            border: `1px solid ${alpha(
                              theme.palette.warning.main,
                              0.08
                            )}`,
                            borderRadius: 2,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              mb={2}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Avg. Session Duration
                              </Typography>
                              <AccessTimeIcon
                                sx={{
                                  fontSize: 20,
                                  color: "warning.main",
                                  opacity: 0.6,
                                }}
                              />
                            </Box>
                            <Typography
                              variant="h3"
                              fontWeight={700}
                              color="warning.main"
                              sx={{
                                fontSize: "36px",
                                letterSpacing: "-0.02em",
                                mb: 1,
                              }}
                            >
                              {(() => {
                                const duration =
                                  dashboardData.chart_data.ga4_traffic_overview
                                    .averageSessionDuration || 0;
                                const minutes = Math.floor(duration / 60);
                                const seconds = Math.floor(duration % 60);
                                return `${minutes}:${seconds
                                  .toString()
                                  .padStart(2, "0")}`;
                              })()}
                            </Typography>
                            <Box
                              sx={{
                                minHeight: '24px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {dashboardData.chart_data.ga4_traffic_overview
                                .avgSessionDurationChange >= 0 && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <TrendingUpIcon
                                    sx={{ fontSize: 14, color: "success.main" }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "success.main",
                                    }}
                                  >
                                    {Math.abs(
                                      dashboardData.chart_data.ga4_traffic_overview
                                        .avgSessionDurationChange
                                    ).toFixed(1)}
                                    %
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: "12px" }}
                                  >
                                    vs last period
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                      >
                        <Card
                          sx={{
                            background:
                              "linear-gradient(135deg, rgba(88, 86, 214, 0.04) 0%, rgba(0, 122, 255, 0.04) 100%)",
                            border: `1px solid ${alpha(
                              theme.palette.secondary.main,
                              0.08
                            )}`,
                            borderRadius: 2,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              mb={2}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Engagement Rate
                              </Typography>
                              <VisibilityIcon
                                sx={{
                                  fontSize: 20,
                                  color: "secondary.main",
                                  opacity: 0.6,
                                }}
                              />
                            </Box>
                            <Typography
                              variant="h3"
                              fontWeight={700}
                              color="secondary.main"
                              sx={{
                                fontSize: "36px",
                                letterSpacing: "-0.02em",
                                mb: 1,
                              }}
                            >
                              {(
                                (dashboardData.chart_data.ga4_traffic_overview
                                  .engagementRate || 0) * 100
                              ).toFixed(1)}
                              %
                            </Typography>
                            <Box
                              sx={{
                                minHeight: '24px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {dashboardData.chart_data.ga4_traffic_overview
                                .engagementRateChange >= 0 && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <TrendingUpIcon
                                    sx={{ fontSize: 14, color: "success.main" }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "success.main",
                                    }}
                                  >
                                    {Math.abs(
                                      dashboardData.chart_data.ga4_traffic_overview
                                        .engagementRateChange
                                    ).toFixed(1)}
                                    %
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: "12px" }}
                                  >
                                    vs last period
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  </Grid>
                )}

                {/* GA4 Performance Charts - Prominent Line Graphs */}
                {dashboardData.chart_data?.ga4_daily_comparison?.length > 0 && (
                  <Box sx={{ mt: 4 }}>
                    <Grid container spacing={3}>
                      {/* Active Users Chart - Full Width (Primary Chart) */}
                      <Grid item xs={12}>
                        <ChartCard
                          title="Active Users"
                          badge="GA4"
                          badgeColor={CHART_COLORS.ga4.primary}
                          height={500}
                          animationDelay={0.3}
                        >
                          <LineChartEnhanced
                            data={dashboardData.chart_data.ga4_daily_comparison}
                                    dataKey="date"
                            lines={[
                              {
                                dataKey: "current_users",
                                name: getDateRangeLabel(),
                                color: CHART_COLORS.comparison.current,
                                strokeWidth: 3,
                              },
                              {
                                dataKey: "previous_users",
                                name: "Previous period",
                                color: CHART_COLORS.comparison.previous,
                                strokeWidth: 2.5,
                                strokeDasharray: "5 5",
                              },
                            ]}
                            xAxisFormatter={formatDateForAxis}
                            formatter={(value) => [value.toLocaleString(), "Users"]}
                            labelFormatter={(label) => {
                              if (label && label.length === 8) {
                                const year = label.substring(0, 4);
                                const month = label.substring(4, 6);
                                const day = label.substring(6, 8);
                                return `${day} ${getMonthName(parseInt(month))} ${year}`;
                              }
                              return label;
                            }}
                            height={400}
                          />
                        </ChartCard>
                      </Grid>

                      {/* Sessions Comparison Chart */}
                      <Grid item xs={12} md={6}>
                        <ChartCard
                          title="Sessions"
                          badge="GA4"
                          badgeColor={CHART_COLORS.ga4.primary}
                          height={400}
                          animationDelay={0.35}
                        >
                          <LineChartEnhanced
                            data={dashboardData.chart_data.ga4_daily_comparison}
                                    dataKey="date"
                            lines={[
                              {
                                dataKey: "current_sessions",
                                name: getDateRangeLabel(),
                                color: CHART_COLORS.comparison.current,
                                strokeWidth: 3,
                              },
                              {
                                dataKey: "previous_sessions",
                                name: "Previous period",
                                color: CHART_COLORS.comparison.previous,
                                strokeWidth: 2.5,
                                strokeDasharray: "5 5",
                              },
                            ]}
                            xAxisFormatter={formatDateForAxis}
                            formatter={(value) => [value.toLocaleString(), "Sessions"]}
                            labelFormatter={(label) => {
                              if (label && label.length === 8) {
                                const year = label.substring(0, 4);
                                const month = label.substring(4, 6);
                                const day = label.substring(6, 8);
                                return `${day} ${getMonthName(parseInt(month))} ${year}`;
                              }
                              return label;
                            }}
                            height={320}
                          />
                        </ChartCard>
                      </Grid>

                      {/* New Users Comparison Chart */}
                      <Grid item xs={12} md={6}>
                        <ChartCard
                          title="New Users"
                          badge="GA4"
                          badgeColor={CHART_COLORS.ga4.primary}
                          height={400}
                          animationDelay={0.4}
                        >
                          <LineChartEnhanced
                            data={dashboardData.chart_data.ga4_daily_comparison}
                                    dataKey="date"
                            lines={[
                              {
                                dataKey: "current_new_users",
                                name: getDateRangeLabel(),
                                color: CHART_COLORS.success,
                                strokeWidth: 3,
                              },
                              {
                                dataKey: "previous_new_users",
                                name: "Previous period",
                                color: CHART_COLORS.comparison.previous,
                                strokeWidth: 2.5,
                                strokeDasharray: "5 5",
                              },
                            ]}
                            xAxisFormatter={formatDateForAxis}
                            formatter={(value) => [value.toLocaleString(), "New Users"]}
                            labelFormatter={(label) => {
                              if (label && label.length === 8) {
                                const year = label.substring(0, 4);
                                const month = label.substring(4, 6);
                                const day = label.substring(6, 8);
                                return `${day} ${getMonthName(parseInt(month))} ${year}`;
                              }
                              return label;
                            }}
                            height={320}
                          />
                        </ChartCard>
                      </Grid>

                      {/* Conversions Comparison Chart */}
                      {dashboardData.chart_data.ga4_daily_comparison.some(
                        (d) =>
                          d.current_conversions > 0 ||
                          d.previous_conversions > 0
                      ) && (
                        <Grid item xs={12} md={6}>
                          <ChartCard
                            title="Conversions"
                            badge="GA4"
                            badgeColor={CHART_COLORS.ga4.primary}
                            height={400}
                            animationDelay={0.45}
                          >
                            <LineChartEnhanced
                              data={dashboardData.chart_data.ga4_daily_comparison}
                                      dataKey="date"
                              lines={[
                                {
                                  dataKey: "current_conversions",
                                  name: getDateRangeLabel(),
                                  color: CHART_COLORS.warning,
                                  strokeWidth: 2.5,
                                },
                                {
                                  dataKey: "previous_conversions",
                                  name: "Previous period",
                                  color: CHART_COLORS.comparison.previous,
                                  strokeWidth: 2,
                                  strokeDasharray: "5 5",
                                },
                              ]}
                              xAxisFormatter={(value) => {
                                        if (value && value.length === 8) {
                                          const day = value.substring(6, 8);
                                          return day;
                                        }
                                        return value;
                                      }}
                              formatter={(value) => [value.toLocaleString(), "Conversions"]}
                              labelFormatter={(label) => {
                                if (label && label.length === 8) {
                                  const year = label.substring(0, 4);
                                  const month = label.substring(4, 6);
                                  const day = label.substring(6, 8);
                                  return `${day} ${getMonthName(parseInt(month))} ${year}`;
                                }
                                return label;
                              }}
                              height={320}
                            />
                          </ChartCard>
                        </Grid>
                      )}

                      {/* Revenue Comparison Chart */}
                      {dashboardData.chart_data.ga4_daily_comparison.some(
                        (d) => d.current_revenue > 0 || d.previous_revenue > 0
                      ) && (
                        <Grid item xs={12} md={6}>
                          <ChartCard
                            title="Revenue"
                            badge="GA4"
                            badgeColor={CHART_COLORS.ga4.primary}
                            height={400}
                            animationDelay={0.5}
                          >
                            <LineChartEnhanced
                              data={dashboardData.chart_data.ga4_daily_comparison}
                                      dataKey="date"
                              lines={[
                                {
                                  dataKey: "current_revenue",
                                  name: getDateRangeLabel(),
                                  color: CHART_COLORS.success,
                                  strokeWidth: 2.5,
                                },
                                {
                                  dataKey: "previous_revenue",
                                  name: "Previous period",
                                  color: CHART_COLORS.comparison.previous,
                                  strokeWidth: 2,
                                  strokeDasharray: "5 5",
                                },
                              ]}
                              xAxisFormatter={(value) => {
                                        if (value && value.length === 8) {
                                          const day = value.substring(6, 8);
                                          return day;
                                        }
                                        return value;
                                      }}
                                      formatter={(value) =>
                                        `$${value.toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}`
                                      }
                              labelFormatter={(label) => {
                                if (label && label.length === 8) {
                                  const year = label.substring(0, 4);
                                  const month = label.substring(4, 6);
                                  const day = label.substring(6, 8);
                                  return `${day} ${getMonthName(parseInt(month))} ${year}`;
                                }
                                return label;
                              }}
                              height={320}
                            />
                          </ChartCard>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                {/* Top Performing Pages - Horizontal Bar Chart */}
                {dashboardData.chart_data?.top_pages &&
                  dashboardData.chart_data.top_pages.length > 0 && (
                    <ChartCard
                      title="Top Performing Pages"
                      badge="GA4"
                      badgeColor={CHART_COLORS.ga4.primary}
                      height={500}
                      animationDelay={0.9}
                    >
                      <BarChartEnhanced
                        data={dashboardData.chart_data.top_pages.slice(0, 10)}
                        dataKey="pagePath"
                        horizontal={true}
                        bars={[
                          {
                            dataKey: "views",
                            name: "Page Views",
                            color: CHART_COLORS.primary,
                          },
                        ]}
                        formatter={(value) => [value.toLocaleString(), "Views"]}
                              margin={{
                                top: 5,
                                right: 30,
                                left: 150,
                                bottom: 5,
                              }}
                        height={400}
                      />
                    </ChartCard>
                  )}

                {/* Sessions by Channel - Donut Chart & Bar Chart */}
                {dashboardData.chart_data?.traffic_sources &&
                  dashboardData.chart_data.traffic_sources.length > 0 && (
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      {/* Donut Chart */}
                      <Grid item xs={12} md={6}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 1.0 }}
                        >
                          <Card
                            sx={{
                              height: "100%",
                              borderRadius: 2,
                              border: `1px solid ${theme.palette.divider}`,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Typography
                                variant="h6"
                                mb={2}
                                fontWeight={600}
                                sx={{
                                  fontSize: "1.125rem",
                                  letterSpacing: "-0.01em",
                                }}
                              >
                                Traffic Sources Distribution
                              </Typography>
                              <Box sx={{ width: '100%', height: 300, padding: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart
                                    margin={{
                                      top: 10,
                                      right: 10,
                                      bottom: 10,
                                      left: 10
                                    }}
                                  >
                                    <Pie
                                      data={dashboardData.chart_data.traffic_sources
                                        .slice(0, 6)
                                        .map((item) => ({
                                          name: item.source || "Unknown",
                                          value: item.sessions || 0,
                                        }))}
                                      cx="50%"
                                      cy="50%"
                                    labelLine={false}
                                    label={false}
                                      outerRadius={90}
                                      innerRadius={50}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {dashboardData.chart_data.traffic_sources
                                        .slice(0, 6)
                                        .map((entry, index) => {
                                          const colors = [
                                            theme.palette.primary.main,
                                            theme.palette.secondary.main,
                                            theme.palette.success.main,
                                            theme.palette.warning.main,
                                            theme.palette.error.main,
                                            theme.palette.info.main,
                                          ];
                                          return (
                                            <Cell
                                              key={`cell-${index}`}
                                              fill={colors[index % colors.length]}
                                            />
                                          );
                                        })}
                                    </Pie>
                                    <Tooltip
                                      contentStyle={{
                                        borderRadius: "8px",
                                        border: "none",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                        backgroundColor: "#FFFFFF",
                                      }}
                                      formatter={(value) => [
                                        value.toLocaleString(),
                                        "Sessions",
                                      ]}
                                    />
                                    <Legend
                                      wrapperStyle={{ 
                                        paddingTop: "20px",
                                        paddingBottom: "10px"
                                      }}
                                      formatter={(value) =>
                                        value.length > 15
                                          ? value.substring(0, 15) + "..."
                                          : value
                                      }
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </Box>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>

                      {/* Horizontal Bar Chart */}
                      <Grid item xs={12} md={6}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 1.05 }}
                        >
                          <Card
                            sx={{
                              height: "100%",
                              borderRadius: 2,
                              border: `1px solid ${theme.palette.divider}`,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Typography
                                variant="h6"
                                mb={2}
                                fontWeight={600}
                                sx={{
                                  fontSize: "1.125rem",
                                  letterSpacing: "-0.01em",
                                }}
                              >
                                Sessions by Channel
                              </Typography>
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                  data={dashboardData.chart_data.traffic_sources.slice(
                                    0,
                                    8
                                  )}
                                  layout="vertical"
                                  margin={{
                                    top: 5,
                                    right: 30,
                                    left: 80,
                                    bottom: 5,
                                  }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    horizontal={false}
                                    stroke="#E4E4E7"
                                  />
                                  <XAxis
                                    type="number"
                                    tick={{ fontSize: 12 }}
                                    stroke="#71717A"
                                  />
                                  <YAxis
                                    dataKey="source"
                                    type="category"
                                    width={75}
                                    stroke="#71717A"
                                    tick={{ fontSize: 11 }}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      borderRadius: "8px",
                                      border: "none",
                                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                      backgroundColor: "#FFFFFF",
                                    }}
                                    formatter={(value) => [
                                      value.toLocaleString(),
                                      "Sessions",
                                    ]}
                                  />
                                  <Legend />
                                  <Bar
                                    dataKey="sessions"
                                    radius={[0, 4, 4, 0]}
                                    fill={theme.palette.primary.main}
                                    name="Sessions"
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>
                    </Grid>
                  )}

                {/* Stacked Bar Chart - Sessions vs Users by Channel */}
                {dashboardData.chart_data?.traffic_sources &&
                  dashboardData.chart_data.traffic_sources.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 1.1 }}
                    >
                      <Card
                        sx={{
                          mb: 3,
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Typography
                            variant="h6"
                            mb={2}
                            fontWeight={600}
                            sx={{
                              fontSize: "1.125rem",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            Sessions vs Users by Channel
                          </Typography>
                          <ResponsiveContainer width="100%" height={350}>
                            <BarChart
                              data={dashboardData.chart_data.traffic_sources.slice(
                                0,
                                8
                              )}
                              margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 60,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#E4E4E7"
                              />
                              <XAxis
                                dataKey="source"
                                tick={{ fontSize: 11 }}
                                stroke="#71717A"
                                angle={0}
                                textAnchor="middle"
                                height={50}
                                interval="preserveStartEnd"
                              />
                              <YAxis tick={{ fontSize: 12 }} stroke="#71717A" />
                              <Tooltip
                                contentStyle={{
                                  borderRadius: "8px",
                                  border: "none",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                  backgroundColor: "#FFFFFF",
                                }}
                                formatter={(value) => [
                                  value.toLocaleString(),
                                  "",
                                ]}
                              />
                              <Legend />
                              <Bar
                                dataKey="sessions"
                                stackId="a"
                                fill={theme.palette.primary.main}
                                name="Sessions"
                                radius={[0, 0, 0, 0]}
                              />
                              <Bar
                                dataKey="users"
                                stackId="a"
                                fill={theme.palette.secondary.main}
                                name="Users"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                {/* Geographic Breakdown - Bar Chart & Pie Chart */}
                {dashboardData.chart_data?.geographic_breakdown &&
                  dashboardData.chart_data.geographic_breakdown.length > 0 && (
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      {/* Bar Chart */}
                      <Grid item xs={12} md={7}>
                        <ChartCard
                          title="Geographic Distribution"
                          badge="GA4"
                          badgeColor={CHART_COLORS.ga4.primary}
                          height="100%"
                          animationDelay={1.2}
                        >
                          <BarChartEnhanced
                            data={dashboardData.chart_data.geographic_breakdown.slice(0, 10)}
                            dataKey="country"
                            bars={[
                              {
                                dataKey: "users",
                                name: "Users",
                                color: CHART_COLORS.primary,
                              },
                            ]}
                            formatter={(value) => [value.toLocaleString(), "Users"]}
                            xAxisFormatter={(value) => value}
                                  margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                  }}
                            height={350}
                          />
                        </ChartCard>
                      </Grid>

                      {/* Pie Chart */}
                      <Grid item xs={12} md={5}>
                        <ChartCard
                          title="Top Countries"
                          badge="GA4"
                          badgeColor={CHART_COLORS.ga4.primary}
                          height={450}
                          animationDelay={1.25}
                        >
                          <PieChartEnhanced
                                    data={dashboardData.chart_data.geographic_breakdown
                                      .slice(0, 6)
                                      .map((item) => ({
                                        name: item.country || "Unknown",
                                        value: item.users || 0,
                                      }))}
                            donut={false}
                            colors={CHART_COLORS.palette}
                            formatter={(value, name) => [
                                      value.toLocaleString(),
                                      "Users",
                                    ]}
                            height={350}
                          />
                        </ChartCard>
                      </Grid>
                    </Grid>
                  )}

                {/* KPI Donut Charts - Bounce Rate, Engagement Rate, Brand Presence */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {/* Bounce Rate Donut */}
                  {dashboardData?.kpis?.bounce_rate && (
                    <Grid item xs={12} sm={6} md={4}>
                      <ChartCard
                        title="Bounce Rate"
                        badge="GA4"
                        badgeColor={CHART_COLORS.ga4.primary}
                        height="100%"
                        animationDelay={1.3}
                        sx={{ textAlign: "center" }}
                      >
                        <Box>
                          <PieChartEnhanced
                                  data={[
                                    {
                                      name: "Bounced",
                                value: dashboardData.kpis.bounce_rate.value || 0,
                                    },
                                    {
                                      name: "Engaged",
                                      value:
                                  100 - (dashboardData.kpis.bounce_rate.value || 0),
                                    },
                                  ]}
                            donut={true}
                                  innerRadius={60}
                                  outerRadius={90}
                            colors={[CHART_COLORS.error, CHART_COLORS.success]}
                                  formatter={(value, name) => [
                                    `${value.toFixed(1)}%`,
                                    name,
                                  ]}
                            showLabel={true}
                            height={250}
                          />
                            <Box mt={2}>
                              <Typography
                                variant="h4"
                                fontWeight={700}
                                sx={{ fontSize: "2rem" }}
                                color={
                                  dashboardData.kpis.bounce_rate.value > 50
                                    ? "error.main"
                                    : "success.main"
                                }
                              >
                              {(dashboardData.kpis.bounce_rate.value || 0).toFixed(1)}%
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  fontSize: "0.75rem",
                                  display: "block",
                                  mt: 0.5,
                                }}
                              >
                                Bounced Sessions
                              </Typography>
                            </Box>
                        </Box>
                      </ChartCard>
                    </Grid>
                  )}

                  {/* Engagement Rate Donut
                  {dashboardData?.kpis?.ga4_engagement_rate && (
                    <Grid item xs={12} sm={6} md={4}>
                      <ChartCard
                        title="Engagement Rate"
                        badge="GA4"
                        badgeColor={CHART_COLORS.ga4.primary}
                        height="100%"
                        animationDelay={1.35}
                        sx={{ textAlign: "center" }}
                      >
                        <Box>
                          <PieChartEnhanced
                                  data={[
                                    {
                                      name: "Engaged",
                                      value:
                                  (dashboardData.kpis.ga4_engagement_rate.value || 0) *
                                  100,
                                    },
                                    {
                                      name: "Not Engaged",
                                      value:
                                        100 -
                                  (dashboardData.kpis.ga4_engagement_rate.value || 0) *
                                          100,
                                    },
                                  ]}
                            donut={true}
                                  innerRadius={60}
                                  outerRadius={90}
                            colors={[CHART_COLORS.success, theme.palette.grey[300]]}
                                  formatter={(value, name) => [
                                    `${value.toFixed(1)}%`,
                                    name,
                                  ]}
                            showLabel={true}
                            height={250}
                          />
                            <Box mt={2}>
                              <Typography
                                variant="h4"
                                fontWeight={700}
                                sx={{ fontSize: "2rem" }}
                                color="success.main"
                              >
                                {(
                                (dashboardData.kpis.ga4_engagement_rate.value || 0) * 100
                                ).toFixed(1)}
                                %
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  fontSize: "0.75rem",
                                  display: "block",
                                  mt: 0.5,
                                }}
                              >
                                Engaged Sessions
                              </Typography>
                            </Box>
                        </Box>
                      </ChartCard>
                    </Grid>
                  )} */}

                  {/* Brand Presence Rate Donut
                  {dashboardData?.kpis?.brand_presence_rate && (
                    <Grid item xs={12} sm={6} md={4}>
                      <ChartCard
                        title="Brand Presence Rate"
                        badge="Scrunch"
                        badgeColor={CHART_COLORS.scrunch.primary}
                        height="100%"
                        animationDelay={1.4}
                        sx={{ textAlign: "center" }}
                      >
                        <Box>
                          <PieChartEnhanced
                                  data={[
                                    {
                                      name: "Present",
                                value: dashboardData.kpis.brand_presence_rate.value || 0,
                                    },
                                    {
                                      name: "Absent",
                                      value:
                                  100 - (dashboardData.kpis.brand_presence_rate.value || 0),
                                    },
                                  ]}
                            donut={true}
                                  innerRadius={60}
                                  outerRadius={90}
                            colors={[CHART_COLORS.success, theme.palette.grey[300]]}
                                  formatter={(value, name) => [
                                    `${value.toFixed(1)}%`,
                                    name,
                                  ]}
                            showLabel={true}
                            height={250}
                          />
                            <Box mt={2}>
                              <Typography
                                variant="h4"
                                fontWeight={700}
                                sx={{ fontSize: "2rem" }}
                                color="success.main"
                              >
                              {(dashboardData.kpis.brand_presence_rate.value || 0).toFixed(1)}%
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  fontSize: "0.75rem",
                                  display: "block",
                                  mt: 0.5,
                                }}
                              >
                                Brand Present in Responses
                              </Typography>
                            </Box>
                        </Box>
                      </ChartCard>
                    </Grid>
                  )} */}
                </Grid>

                {/* Top Keywords Ranking - Bar Chart */}
                {dashboardData.chart_data?.all_keywords_ranking &&
                  dashboardData.chart_data.all_keywords_ranking.length > 0 && (
                    <ChartCard
                      title="Top Keywords Ranking"
                      badge="AgencyAnalytics"
                      badgeColor={CHART_COLORS.agencyAnalytics.primary}
                      height={500}
                      animationDelay={0.2}
                    >
                      <BarChartEnhanced
                              data={dashboardData.chart_data.all_keywords_ranking
                                .slice(0, 15)
                                .map((kw) => ({
                                  keyword: kw.keyword || "Unknown",
                                  rank: kw.google_rank || 0,
                                  searchVolume: kw.search_volume || 0,
                                }))}
                                dataKey="keyword"
                        horizontal={true}
                        bars={[
                          {
                            dataKey: "rank",
                            name: "Rank",
                            color: CHART_COLORS.agencyAnalytics.primary,
                          },
                        ]}
                                formatter={(value, name) => {
                                  if (name === "rank")
                                    return [`Position ${value}`, "Rank"];
                                  if (name === "searchVolume")
                            return [value.toLocaleString(), "Search Volume"];
                                  return [value, name];
                                }}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 120,
                          bottom: 5,
                        }}
                        height={400}
                      />
                    </ChartCard>
                  )}
              </Box>
            </SectionContainer>
          )}

          {/* Scrunch AI Section */}

          <Box>
            {/* Scrunch AI Section - Show independently if Scrunch data is available */}
            {(() => {
              // Check section visibility first
              const sectionVisible = isSectionVisible("scrunch_ai");
              console.log("Scrunch AI section visibility check:", {
                isPublic,
                sectionVisible,
                publicVisibleSections: publicVisibleSections ? Array.from(publicVisibleSections) : null,
                hasDashboardData: !!dashboardData,
                dashboardKPICount: dashboardData?.kpis ? Object.keys(dashboardData.kpis).length : 0,
              });

              if (!sectionVisible) {
                return null;
              }

              // Check if we have Scrunch data from separate endpoint
              const hasScrunchData =
                scrunchData?.kpis && Object.keys(scrunchData.kpis).length > 0;
              const hasScrunchChartData =
                scrunchData?.chart_data &&
                (scrunchData.chart_data.top_performing_prompts?.length > 0 ||
                  scrunchData.chart_data.scrunch_ai_insights?.length > 0);

              // Check if we have Scrunch data from main endpoint (fallback)
              const scrunchKPIsFromMain = dashboardData?.kpis
                ? Object.keys(dashboardData.kpis).filter((k) => {
                    const kpi = dashboardData.kpis[k];
                    return kpi?.source === "Scrunch";
                  })
                : [];
              const hasScrunchFromMain =
                scrunchKPIsFromMain.length > 0 ||
                dashboardData?.chart_data?.top_performing_prompts?.length > 0 ||
                dashboardData?.chart_data?.scrunch_ai_insights?.length > 0;

              const shouldShow =
                loadingScrunch ||
                hasScrunchData ||
                hasScrunchChartData ||
                hasScrunchFromMain;

              // Debug logging
              console.log("Scrunch section data check:", {
                loadingScrunch,
                hasScrunchData,
                hasScrunchChartData,
                scrunchKPIsFromMain: scrunchKPIsFromMain.length,
                scrunchKPIsFromMainKeys: scrunchKPIsFromMain,
                hasScrunchFromMain,
                shouldShow,
                dashboardDataKeys: dashboardData?.kpis ? Object.keys(dashboardData.kpis) : [],
                hasTopPrompts: !!dashboardData?.chart_data?.top_performing_prompts?.length,
                hasInsights: !!dashboardData?.chart_data?.scrunch_ai_insights?.length,
              });

              return shouldShow;
            })() && (
              <SectionContainer
                title="Scrunch AI"
                description="AI platform presence and engagement metrics"
                loading={loadingScrunch}
              >

                    {/* Use scrunchData if available, otherwise fall back to dashboardData */}
                    {(() => {
                      // Prefer scrunchData, but fall back to dashboardData if scrunchData doesn't have KPIs
                      // In public mode, scrunchData is never loaded, so always use dashboardData
                      let scrunchKPIs = {};
                      let scrunchChartData = {};

                      if (
                        !isPublic &&
                        scrunchData?.kpis &&
                        Object.keys(scrunchData.kpis).length > 0
                      ) {
                        scrunchKPIs = scrunchData.kpis;
                        scrunchChartData = scrunchData.chart_data || {};
                        console.log(
                          "Using Scrunch data from separate endpoint:",
                          Object.keys(scrunchKPIs).length,
                          "KPIs"
                        );
                      } else if (dashboardData?.kpis) {
                        // Filter only Scrunch KPIs from dashboardData
                        // This is the primary source for public mode
                        const scrunchKeys = Object.keys(
                          dashboardData.kpis
                        ).filter((k) => {
                          const kpi = dashboardData.kpis[k];
                          return kpi?.source === "Scrunch";
                        });
                        if (scrunchKeys.length > 0) {
                          scrunchKPIs = {};
                          scrunchKeys.forEach((k) => {
                            scrunchKPIs[k] = dashboardData.kpis[k];
                          });
                          scrunchChartData = dashboardData.chart_data || {};
                          console.log(
                            `Using Scrunch data from main endpoint ${isPublic ? '(public mode)' : '(fallback)'}:`,
                            scrunchKeys.length,
                            "KPIs:",
                            scrunchKeys
                          );
                        } else {
                          console.warn("No Scrunch KPIs found in dashboardData.kpis. Available KPIs:", 
                            dashboardData.kpis ? Object.keys(dashboardData.kpis) : []);
                        }
                      } else {
                        console.warn("No dashboardData.kpis available");
                      }

                      // Only render if we have actual data
                      const hasData =
                        Object.keys(scrunchKPIs).length > 0 ||
                        scrunchChartData?.top_performing_prompts?.length > 0 ||
                        scrunchChartData?.scrunch_ai_insights?.length > 0;

                      if (!hasData) {
                        return (
                          <Box p={3}>
                            <Typography color="text.secondary">
                              No Scrunch data available for the selected date
                              range.
                            </Typography>
                          </Box>
                        );
                      }

                      return (
                        <>
                          {/* Brand Presence Rate Donut */}
                          {/* {scrunchKPIs?.brand_presence_rate && (
                            <Box sx={{ mb: 4 }}>
                              <Typography
                                variant="h6"
                                fontWeight={600}
                                mb={2}
                                sx={{
                                  fontSize: "1.125rem",
                                  letterSpacing: "-0.01em",
                                }}
                              >
                                Brand Presence Metrics
                              </Typography>
                              <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={4}>
                                  <ChartCard
                                    title="Brand Presence Rate"
                                    badge="Scrunch"
                                    badgeColor={CHART_COLORS.scrunch.primary}
                                    height="100%"
                                    animationDelay={0.1}
                                    sx={{ textAlign: "center" }}
                                  >
                                    <Box>
                                      <PieChartEnhanced
                                              data={[
                                                {
                                                  name: "Present",
                                                  value:
                                              scrunchKPIs.brand_presence_rate.value || 0,
                                                },
                                                {
                                                  name: "Absent",
                                                  value:
                                                    100 -
                                              (scrunchKPIs.brand_presence_rate.value || 0),
                                                },
                                              ]}
                                        donut={true}
                                              innerRadius={60}
                                              outerRadius={90}
                                        colors={[CHART_COLORS.success, theme.palette.grey[300]]}
                                              formatter={(value, name) => [
                                                `${value.toFixed(1)}%`,
                                                name,
                                              ]}
                                        showLabel={true}
                                        height={250}
                                      />
                                        <Box mt={2}>
                                          <Typography
                                            variant="h4"
                                            fontWeight={700}
                                            sx={{ fontSize: "2rem" }}
                                            color="success.main"
                                          >
                                            {(
                                            scrunchKPIs.brand_presence_rate.value || 0
                                            ).toFixed(1)}
                                            %
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                              fontSize: "0.75rem",
                                              display: "block",
                                              mt: 0.5,
                                            }}
                                          >
                                            Brand Present in Responses
                                          </Typography>
                                        </Box>
                                    </Box>
                                  </ChartCard>
                                </Grid>
                              </Grid>
                            </Box>
                          )} */}

                          {/* Top Performing Prompts Section */}
                          {scrunchChartData?.top_performing_prompts &&
                            scrunchChartData.top_performing_prompts.length >
                              0 && (
                              <Box sx={{ mb: 4 }}>
                                <Typography
                                  variant="h6"
                                  fontWeight={600}
                                  mb={2}
                                  sx={{
                                    fontSize: "1.125rem",
                                    letterSpacing: "-0.01em",
                                  }}
                                >
                                  Top Performing Prompts
                                </Typography>

                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.5, delay: 0.3 }}
                                >
                                  <Card
                                    sx={{
                                      mb: 3,
                                      borderRadius: 2,
                                      border: `1px solid ${theme.palette.divider}`,
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    }}
                                  >
                                    <CardContent sx={{ p: 3 }}>
                                      <Grid container spacing={2}>
                                        {scrunchChartData.top_performing_prompts.map(
                                          (prompt) => (
                                            <Grid
                                              item
                                              xs={12}
                                              sm={6}
                                              md={4}
                                              key={prompt.id}
                                            >
                                              <Paper
                                                sx={{
                                                  p: 2,
                                                  borderLeft: `3px solid ${theme.palette.primary.main}`,
                                                  borderRadius: 1.5,
                                                  transition: "all 0.2s",
                                                  "&:hover": {
                                                    transform:
                                                      "translateX(2px)",
                                                    boxShadow:
                                                      "0 2px 8px rgba(0, 0, 0, 0.06)",
                                                  },
                                                }}
                                              >
                                                <Box
                                                  display="flex"
                                                  alignItems="flex-start"
                                                  justifyContent="space-between"
                                                  mb={1}
                                                >
                                                  <Box
                                                    display="flex"
                                                    alignItems="center"
                                                    gap={1}
                                                  >
                                                    <Chip
                                                      label={`Rank #${prompt.rank}`}
                                                      size="small"
                                                      sx={{
                                                        bgcolor: "primary.main",
                                                        color: "white",
                                                        fontWeight: 700,
                                                        fontSize: "11px",
                                                        height: 22,
                                                        minWidth: 50,
                                                      }}
                                                    />
                                                  </Box>
                                                </Box>
                                                <Typography
                                                  variant="body2"
                                                  fontWeight={600}
                                                  sx={{
                                                    fontSize: "0.875rem",
                                                    lineHeight: 1.4,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                  }}
                                                >
                                                  {prompt.text || "N/A"}
                                                </Typography>
                                                <Box
                                                  display="flex"
                                                  gap={2}
                                                  mt={1.5}
                                                >
                                                  <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{
                                                      fontSize: "11px",
                                                      fontWeight: 500,
                                                    }}
                                                  >
                                                    {prompt.responseCount?.toLocaleString() ||
                                                      0}{" "}
                                                    responses
                                                  </Typography>
                                                  <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{
                                                      fontSize: "11px",
                                                      fontWeight: 500,
                                                    }}
                                                  >
                                                    {prompt.variants || 0}{" "}
                                                    variants
                                                  </Typography>
                                                </Box>
                                              </Paper>
                                            </Grid>
                                          )
                                        )}
                                      </Grid>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              </Box>
                            )}

                          {/* Scrunch AI Insights Section */}
                          {((dashboardData?.chart_data?.scrunch_ai_insights &&
                            dashboardData.chart_data.scrunch_ai_insights.length > 0) ||
                            (scrunchData?.chart_data?.scrunch_ai_insights &&
                              scrunchData.chart_data.scrunch_ai_insights.length > 0)) && (() => {
                              // Get all insights data
                              const allInsights = scrunchData?.chart_data?.scrunch_ai_insights || dashboardData?.chart_data?.scrunch_ai_insights || [];
                              
                              // Calculate pagination
                              const totalInsights = allInsights.length;
                              const startIndex = insightsPage * insightsRowsPerPage;
                              const endIndex = startIndex + insightsRowsPerPage;
                              const paginatedInsights = allInsights.slice(startIndex, endIndex);
                              
                              // Reset page if current page is out of bounds
                              if (insightsPage > 0 && startIndex >= totalInsights) {
                                setInsightsPage(0);
                              }
                              
                              return (
                                <Box sx={{ mb: 4 }}>
                                  <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.4 }}
                                  >
                                    <Card
                                      sx={{
                                        mb: 3,
                                        borderRadius: 2,
                                        border: `1px solid ${theme.palette.divider}`,
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                      }}
                                    >
                                      <CardContent sx={{ p: 0 }}>
                                        <Box
                                          p={3}
                                          borderBottom="1px solid"
                                          borderColor="divider"
                                        >
                                          <Typography
                                            variant="h6"
                                            fontWeight={600}
                                            sx={{
                                              fontSize: "1.125rem",
                                              letterSpacing: "-0.01em",
                                            }}
                                          >
                                            Scrunch AI Insights
                                          </Typography>
                                        </Box>
                                        <TableContainer>
                                          <Table>
                                            <TableHead>
                                              <TableRow
                                                sx={{
                                                  bgcolor: alpha(
                                                    theme.palette.primary.main,
                                                    0.04
                                                  ),
                                                }}
                                              >
                                                <TableCell
                                                  sx={{
                                                    fontWeight: 700,
                                                    fontSize: "11px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.05em",
                                                    py: 1.5,
                                                    minWidth: 200,
                                                  }}
                                                >
                                                  Seed Prompt
                                                </TableCell>
                                                <TableCell
                                                  sx={{
                                                    fontWeight: 700,
                                                    fontSize: "11px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.05em",
                                                    py: 1.5,
                                                    minWidth: 120,
                                                  }}
                                                >
                                                  Data
                                                </TableCell>
                                                <TableCell
                                                  sx={{
                                                    fontWeight: 700,
                                                    fontSize: "11px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.05em",
                                                    py: 1.5,
                                                    minWidth: 120,
                                                  }}
                                                >
                                                  Presence
                                                </TableCell>
                                                <TableCell
                                                  sx={{
                                                    fontWeight: 700,
                                                    fontSize: "11px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.05em",
                                                    py: 1.5,
                                                    minWidth: 100,
                                                  }}
                                                >
                                                  Citations
                                                </TableCell>
                                                <TableCell
                                                  sx={{
                                                    fontWeight: 700,
                                                    fontSize: "11px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.05em",
                                                    py: 1.5,
                                                    minWidth: 100,
                                                  }}
                                                >
                                                  Competitors
                                                </TableCell>
                                                <TableCell
                                                  sx={{
                                                    fontWeight: 700,
                                                    fontSize: "11px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.05em",
                                                    py: 1.5,
                                                    minWidth: 100,
                                                  }}
                                                >
                                                  Stage
                                                </TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {paginatedInsights.map(
                                                (insight) => (
                                                <TableRow
                                                  key={
                                                    insight.id ||
                                                    insight.seedPrompt
                                                  }
                                                  hover
                                                  sx={{
                                                    transition: "all 0.2s",
                                                    "&:hover": {
                                                      bgcolor: alpha(
                                                        theme.palette.primary
                                                          .main,
                                                        0.02
                                                      ),
                                                    },
                                                  }}
                                                >
                                                  <TableCell sx={{ py: 2 }}>
                                                    <Box>
                                                      <Typography
                                                        variant="body2"
                                                        fontWeight={600}
                                                        sx={{
                                                          fontSize: "0.875rem",
                                                          mb: 0.5,
                                                          lineHeight: 1.4,
                                                        }}
                                                      >
                                                        {insight.seedPrompt
                                                          .length > 60
                                                          ? insight.seedPrompt.substring(
                                                              0,
                                                              60
                                                            ) + "..."
                                                          : insight.seedPrompt}
                                                      </Typography>
                                                      <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{
                                                          fontSize: "11px",
                                                          fontStyle: "italic",
                                                        }}
                                                      >
                                                        {insight.category}
                                                      </Typography>
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell sx={{ py: 2 }}>
                                                    <Box>
                                                      <Typography
                                                        variant="body2"
                                                        sx={{
                                                          fontSize: "0.875rem",
                                                          fontWeight: 600,
                                                          mb: 0.25,
                                                        }}
                                                      >
                                                        {insight.variants?.toLocaleString() ||
                                                          0}{" "}
                                                        variants
                                                      </Typography>
                                                      <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{
                                                          fontSize: "0.75rem",
                                                        }}
                                                      >
                                                        {insight.responses?.toLocaleString() ||
                                                          0}{" "}
                                                        responses
                                                      </Typography>
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell sx={{ py: 2 }}>
                                                    <Box>
                                                      <Typography
                                                        variant="body2"
                                                        fontWeight={700}
                                                        sx={{
                                                          fontSize: "0.9375rem",
                                                          mb: 0.25,
                                                        }}
                                                      >
                                                        {insight.presence}%
                                                      </Typography>
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell sx={{ py: 2 }}>
                                                    <Box>
                                                      <Typography
                                                        variant="body2"
                                                        fontWeight={600}
                                                        sx={{
                                                          fontSize: "0.9375rem",
                                                          mb: 0.25,
                                                        }}
                                                      >
                                                        {insight.citations || 0}
                                                      </Typography>
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell sx={{ py: 2 }}>
                                                    <Box>
                                                      <Typography
                                                        variant="body2"
                                                        fontWeight={600}
                                                        sx={{
                                                          fontSize: "0.9375rem",
                                                          mb: 0.25,
                                                        }}
                                                      >
                                                        {insight.competitors ||
                                                          0}{" "}
                                                        active
                                                      </Typography>
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell sx={{ py: 2 }}>
                                                    <Chip
                                                      label={insight.stage}
                                                      size="small"
                                                      sx={{
                                                        bgcolor:
                                                          insight.stage ===
                                                          "Awareness"
                                                            ? alpha(
                                                                theme.palette
                                                                  .info.main,
                                                                0.1
                                                              )
                                                            : insight.stage ===
                                                              "Evaluation"
                                                            ? alpha(
                                                                theme.palette
                                                                  .warning.main,
                                                                0.1
                                                              )
                                                            : alpha(
                                                                theme.palette
                                                                  .success.main,
                                                                0.1
                                                              ),
                                                        color:
                                                          insight.stage ===
                                                          "Awareness"
                                                            ? "info.main"
                                                            : insight.stage ===
                                                              "Evaluation"
                                                            ? "warning.main"
                                                            : "success.main",
                                                        fontWeight: 600,
                                                        fontSize: "11px",
                                                        height: 24,
                                                      }}
                                                    />
                                                  </TableCell>
                                                </TableRow>
                                              )
                                            )}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                        
                                        {/* Pagination - Only show if more than 10 rows */}
                                        {totalInsights > 10 && (
                                          <TablePagination
                                            component="div"
                                            count={totalInsights}
                                            page={insightsPage}
                                            onPageChange={(event, newPage) => {
                                              setInsightsPage(newPage);
                                            }}
                                            rowsPerPage={insightsRowsPerPage}
                                            onRowsPerPageChange={(event) => {
                                              setInsightsRowsPerPage(parseInt(event.target.value, 10));
                                              setInsightsPage(0);
                                            }}
                                            rowsPerPageOptions={[5, 10, 25, 50]}
                                            sx={{
                                              borderTop: `1px solid ${theme.palette.divider}`,
                                              '& .MuiTablePagination-toolbar': {
                                                px: 2,
                                              },
                                              '& .MuiTablePagination-selectLabel': {
                                                fontSize: '0.875rem',
                                                color: 'text.secondary',
                                              },
                                              '& .MuiTablePagination-displayedRows': {
                                                fontSize: '0.875rem',
                                              },
                                            }}
                                          />
                                        )}
                                        
                                        {totalInsights === 0 && (
                                          <Box p={4} textAlign="center">
                                            <Typography
                                              color="text.secondary"
                                              sx={{ fontSize: "0.875rem" }}
                                            >
                                              No insights available
                                            </Typography>
                                          </Box>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </motion.div>
                                </Box>
                              );
                            })()}
                        </>
                      );
                    })()}

                {/* New Query API Visualizations - Separate component that fetches its own data */}
                {isSectionVisible("advanced_analytics") && selectedBrandId  && (
                  <Box sx={{ mb: 4, mt: 4 }}>
                <Typography
                      variant="h6"
                      fontWeight={600}
                      mb={3}
                  sx={{
                        fontSize: "1.125rem",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Advanced Analytics (Query API)
                </Typography>
                    <ScrunchVisualizations
                      brandId={selectedBrandId}
                      startDate={startDate}
                      endDate={endDate}
                    />
                  </Box>
                )}
              </SectionContainer>
            )}

            {/* Brand Analytics Charts Section */}
            {isSectionVisible("brand_analytics") && brandAnalytics && (
              <SectionContainer
                title="Brand Analytics Insights"
                loading={loadingAnalytics}
              >

                <Grid container spacing={2.5} sx={{ mb: 3 }}>
                  {/* Platform Distribution - Donut Chart */}
                  {brandAnalytics.platform_distribution &&
                    Object.keys(brandAnalytics.platform_distribution).length >
                      0 && (
                      <Grid item xs={12} md={6}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.7 }}
                        >
                          <Card
                            sx={{
                              borderRadius: 2,
                              border: `1px solid ${theme.palette.divider}`,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Typography
                                variant="h6"
                                mb={3}
                                fontWeight={600}
                                sx={{ fontSize: "1rem" }}
                              >
                                Platform Distribution
                              </Typography>
                              <Box sx={{ width: '100%', height: 350, padding: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart
                                    margin={{
                                      top: 10,
                                      right: 10,
                                      bottom: 50,
                                      left: 10
                                    }}
                                  >
                                    <Pie
                                      data={Object.entries(
                                        brandAnalytics.platform_distribution
                                      ).map(([name, value]) => ({
                                        name,
                                        value,
                                      }))}
                                      cx="50%"
                                      cy="45%"
                                    labelLine={false}
                                    label={false}
                                      outerRadius={80}
                                      innerRadius={45}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {Object.entries(
                                        brandAnalytics.platform_distribution
                                      ).map((entry, index) => {
                                        const softColors = [
                                          "rgba(0, 122, 255, 0.5)", // Blue
                                          "rgba(52, 199, 89, 0.5)", // Green
                                          "rgba(255, 149, 0, 0.5)", // Orange
                                          "rgba(255, 45, 85, 0.5)", // Red
                                          "rgba(88, 86, 214, 0.5)", // Purple
                                          "rgba(255, 193, 7, 0.5)", // Yellow
                                          "rgba(90, 200, 250, 0.5)", // Light Blue
                                        ];
                                        return (
                                          <Cell
                                            key={`cell-${index}`}
                                            fill={
                                              softColors[
                                                index % softColors.length
                                              ]
                                            }
                                          />
                                        );
                                      })}
                                    </Pie>
                                    <Tooltip
                                      contentStyle={{
                                        borderRadius: "8px",
                                        border: "none",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                        backgroundColor: "#FFFFFF",
                                      }}
                                    />
                                    <Legend
                                      wrapperStyle={{
                                        paddingTop: "10px",
                                        fontSize: "0.875rem",
                                      }}
                                      iconType="circle"
                                      formatter={(value) => {
                                        const maxLength = 20;
                                        return value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
                                      }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </Box>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>
                    )}

                  {/* Stage Distribution - Pie Chart */}
                  {brandAnalytics.stage_distribution &&
                    Object.keys(brandAnalytics.stage_distribution).length >
                      0 && (
                      <Grid item xs={12} md={6}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.8 }}
                        >
                          <Card
                            sx={{
                              borderRadius: 2,
                              border: `1px solid ${theme.palette.divider}`,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Typography
                                variant="h6"
                                mb={3}
                                fontWeight={600}
                                sx={{ fontSize: "1rem" }}
                              >
                                Funnel Stage Distribution
                              </Typography>
                              <Box sx={{ width: '100%', height: 350, padding: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart
                                    margin={{
                                      top: 10,
                                      right: 10,
                                      bottom: 50,
                                      left: 10
                                    }}
                                  >
                                    <Pie
                                      data={Object.entries(
                                        brandAnalytics.stage_distribution
                                      ).map(([name, value]) => ({
                                        name,
                                        value,
                                      }))}
                                      cx="50%"
                                      cy="45%"
                                    labelLine={false}
                                    label={false}
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {Object.entries(
                                        brandAnalytics.stage_distribution
                                      ).map((entry, index) => {
                                        const softColors = [
                                          "rgba(59, 130, 246, 0.6)", // Light blue
                                          "rgba(20, 184, 166, 0.6)", // Teal/Green
                                          "rgba(251, 146, 60, 0.6)", // Orange
                                          "rgba(239, 68, 68, 0.6)", // Orange-red
                                          "rgba(88, 86, 214, 0.6)", // Purple
                                        ];
                                        return (
                                          <Cell
                                            key={`cell-${index}`}
                                            fill={
                                              softColors[
                                                index % softColors.length
                                              ]
                                            }
                                          />
                                        );
                                      })}
                                    </Pie>
                                    <Tooltip
                                      contentStyle={{
                                        borderRadius: "8px",
                                        border: "none",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                        backgroundColor: "#FFFFFF",
                                      }}
                                    />
                                    <Legend
                                      wrapperStyle={{
                                        paddingTop: "10px",
                                        fontSize: "0.875rem",
                                      }}
                                      iconType="circle"
                                      formatter={(value) => {
                                        const maxLength = 20;
                                        return value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
                                      }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </Box>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>
                    )}

                  {/* Brand Sentiment - Donut Chart */}
                  {brandAnalytics.brand_sentiment &&
                    Object.keys(brandAnalytics.brand_sentiment).filter(
                      (key) => brandAnalytics.brand_sentiment[key] > 0
                    ).length > 0 && (
                      <Grid item xs={12} md={6}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.9 }}
                        >
                          <Card
                            sx={{
                              borderRadius: 2,
                              border: `1px solid ${theme.palette.divider}`,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Typography
                                variant="h6"
                                mb={3}
                                fontWeight={600}
                                sx={{ fontSize: "1rem" }}
                              >
                                Brand Sentiment
                              </Typography>
                              <Box sx={{ width: '100%', height: 350, padding: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart
                                    margin={{
                                      top: 10,
                                      right: 10,
                                      bottom: 50,
                                      left: 10
                                    }}
                                  >
                                    <Pie
                                      data={Object.entries(
                                        brandAnalytics.brand_sentiment
                                      )
                                        .filter(([name, value]) => value > 0)
                                        .map(([name, value]) => ({
                                          name:
                                            name.charAt(0).toUpperCase() +
                                            name.slice(1),
                                          value,
                                        }))}
                                      cx="50%"
                                      cy="45%"
                                    labelLine={false}
                                    label={false}
                                      outerRadius={80}
                                      innerRadius={45}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {Object.entries(
                                        brandAnalytics.brand_sentiment
                                      )
                                        .filter(([name, value]) => value > 0)
                                        .map((entry, index) => {
                                          const colors = {
                                            positive: "rgba(20, 184, 166, 0.6)", // Teal/Green
                                            negative: "rgba(239, 68, 68, 0.6)", // Orange-red
                                            neutral: "rgba(251, 146, 60, 0.6)", // Orange
                                            null: "rgba(88, 86, 214, 0.6)", // Purple
                                          };
                                          const key = entry[0].toLowerCase();
                                          return (
                                            <Cell
                                              key={`cell-${index}`}
                                              fill={
                                                colors[key] ||
                                                "rgba(88, 86, 214, 0.6)"
                                              }
                                            />
                                          );
                                        })}
                                    </Pie>
                                    <Tooltip
                                      contentStyle={{
                                        borderRadius: "8px",
                                        border: "none",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                        backgroundColor: "#FFFFFF",
                                      }}
                                    />
                                    <Legend
                                      wrapperStyle={{
                                        paddingTop: "10px",
                                        fontSize: "0.875rem",
                                      }}
                                      iconType="circle"
                                      formatter={(value) => {
                                        const maxLength = 20;
                                        return value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
                                      }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </Box>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>
                    )}
                </Grid>

                {/* Top Competitors - List */}
                {brandAnalytics.top_competitors &&
                  brandAnalytics.top_competitors.length > 0 && (
                    <Grid container spacing={2.5} sx={{ mb: 3 }}>
                      <Grid item xs={12} md={6}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 1.1 }}
                        >
                          <Card
                            sx={{
                              borderRadius: 2,
                              border: `1px solid ${theme.palette.divider}`,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Typography
                                variant="h6"
                                mb={2}
                                fontWeight={600}
                                sx={{ fontSize: "1rem" }}
                              >
                                Top Competitors
                              </Typography>
                              <Box
                                display="flex"
                                flexDirection="column"
                                gap={1.5}
                              >
                                {brandAnalytics.top_competitors
                                  .slice(0, 10)
                                  .map((comp, idx) => (
                                    <Paper
                                      key={idx}
                                      sx={{
                                        p: 1.5,
                                        borderLeft: `3px solid ${theme.palette.primary.main}`,
                                        borderRadius: 1.5,
                                        transition: "all 0.2s",
                                        "&:hover": {
                                          transform: "translateX(2px)",
                                          boxShadow:
                                            "0 2px 8px rgba(0,0,0,0.05)",
                                        },
                                      }}
                                    >
                                      <Box
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="center"
                                      >
                                        <Box
                                          display="flex"
                                          alignItems="center"
                                          gap={1}
                                        >
                                          <Chip
                                            label={`#${idx + 1}`}
                                            size="small"
                                            sx={{
                                              bgcolor:
                                                theme.palette.primary.main,
                                              color: "white",
                                              fontWeight: 700,
                                              fontSize: "0.7rem",
                                              height: 20,
                                              minWidth: 28,
                                            }}
                                          />
                                          <Typography
                                            variant="body2"
                                            fontWeight={600}
                                            sx={{ fontSize: "0.875rem" }}
                                          >
                                            {comp.name}
                                          </Typography>
                                        </Box>
                                        <Typography
                                          variant="body2"
                                          fontWeight={700}
                                          color="primary.main"
                                          sx={{ fontSize: "0.875rem" }}
                                        >
                                          {comp.count.toLocaleString()}
                                        </Typography>
                                      </Box>
                                    </Paper>
                                  ))}
                              </Box>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>

                      {/* Top Topics - Chips List */}
                      {brandAnalytics.top_topics &&
                        brandAnalytics.top_topics.length > 0 && (
                          <Grid item xs={12} md={6}>
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: 1.2 }}
                            >
                              <Card
                                sx={{
                                  borderRadius: 2,
                                  border: `1px solid ${theme.palette.divider}`,
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                }}
                              >
                                <CardContent sx={{ p: 3 }}>
                                  <Typography
                                    variant="h6"
                                    mb={2}
                                    fontWeight={600}
                                    sx={{ fontSize: "1rem" }}
                                  >
                                    Top Topics
                                  </Typography>
                                  <Box display="flex" flexWrap="wrap" gap={1}>
                                    {brandAnalytics.top_topics
                                      .slice(0, 20)
                                      .map((topic, idx) => (
                                        <Chip
                                          key={idx}
                                          label={`${topic.topic} (${topic.count})`}
                                          size="small"
                                          sx={{
                                            bgcolor: alpha(
                                              theme.palette.primary.main,
                                              0.08
                                            ),
                                            color: "primary.main",
                                            fontWeight: 600,
                                            fontSize: "0.75rem",
                                            height: 28,
                                            "&:hover": {
                                              bgcolor: alpha(
                                                theme.palette.primary.main,
                                                0.15
                                              ),
                                            },
                                          }}
                                        />
                                      ))}
                                  </Box>
                                </CardContent>
                              </Card>
                            </motion.div>
                          </Grid>
                        )}
                    </Grid>
                  )}
              </SectionContainer>
            )}

            {/* General KPI Grid - All Other KPIs */}
            {isSectionVisible("performance_metrics") && displayedKPIs.length > 0 && (
              <SectionContainer title="All Performance Metrics">
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {displayedKPIs.map(([key, kpi], index) => (
                    <KPICard
                      key={key}
                      kpi={kpi}
                      kpiKey={key}
                      index={index}
                      theme={theme}
                    />
                  ))}
                      </Grid>
              </SectionContainer>
            )}


           
          </Box>
        </>
      ) : !loading && selectedBrandId ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No data available for this brand. Please ensure the brand has data
          sources configured:
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <li>GA4: Configure GA4 property ID in brand settings</li>
            <li>
              Agency Analytics: Sync campaigns and link them to this brand
            </li>
            <li>Scrunch: Ensure brand is synced from Scrunch API</li>
          </Box>
        </Alert>
      ) : !loading ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Please select a brand to view the reporting dashboard.
        </Alert>
      ) : null}
      {/* KPI Selector Dialog */}
      <Dialog
        open={showKPISelector}
        onClose={() => setShowKPISelector(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6" fontWeight={600}>
              Select KPIs for Public View
            </Typography>
            
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: 600, overflow: "auto" }}>
          <Box>
            {/* Section Visibility Controls - Nested Structure */}
            <Box mb={4} pb={3} borderBottom={`1px solid ${theme.palette.divider}`}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{
                    fontSize: "1rem",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Dashboard Sections
                </Typography>
                <Box display="flex" gap={1}>
                  <Button size="small" onClick={handleSelectAllSections} variant="outlined">
                    Select All
                  </Button>
                  <Button size="small" onClick={handleDeselectAllSections} variant="outlined">
                    Deselect All
                  </Button>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2} sx={{ fontSize: "0.875rem" }}>
                Choose which sections should be visible in the public dashboard view. Each section shows specific KPIs and visualizations.
              </Typography>

              {/* Nested Dashboard Section Selection with Accordion */}
              {[
                { key: "ga4", label: "Google Analytics", description: "Website traffic and engagement metrics", icon: AnalyticsIcon, color: getSourceColor("GA4") },
                { key: "agency_analytics", label: "Agency Analytics", description: "SEO and keyword ranking metrics (shown in GA4 section)", icon: AnalyticsIcon, color: getSourceColor("AgencyAnalytics") },
                { key: "scrunch_ai", label: "Scrunch AI", description: "AI platform presence and engagement metrics", icon: AnalyticsIcon, color: getSourceColor("Scrunch") },
                { key: "brand_analytics", label: "Brand Analytics Insights", description: "Platform distribution, funnel stages, and sentiment analysis", icon: AnalyticsIcon, color: theme.palette.primary.main },
                { key: "advanced_analytics", label: "Advanced Analytics Query", description: "Detailed Scrunch AI visualizations and insights", icon: AnalyticsIcon, color: theme.palette.secondary.main },
              ].map((section) => {
                const sectionKPIs = getDashboardSectionKPIs(section.key);
                const sectionCharts = getDashboardSectionCharts(section.key);
                const selectedKPICount = sectionKPIs.filter((k) => tempSelectedKPIs.has(k)).length;
                const totalKPICount = sectionKPIs.length;
                const selectedChartCount = sectionCharts.filter((c) => tempSelectedCharts.has(c.key)).length;
                const totalChartCount = sectionCharts.length;
                const isExpanded = expandedSections.has(section.key);
                const allKPIsSelected = areAllDashboardSectionKPIsSelected(section.key);
                const someKPIsSelected = areSomeDashboardSectionKPIsSelected(section.key);
                const allChartsSelected = sectionCharts.length > 0 && sectionCharts.every((c) => tempSelectedCharts.has(c.key));
                const someChartsSelected = sectionCharts.length > 0 && sectionCharts.some((c) => tempSelectedCharts.has(c.key)) && !allChartsSelected;
                const SectionIcon = section.icon;

                return (
                  <Accordion
                    key={section.key}
                    expanded={isExpanded}
                    onChange={handleAccordionChange(section.key)}
                    sx={{
                      mb: 1.5,
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      boxShadow: "none",
                      "&:before": {
                        display: "none",
                      },
                      "&.Mui-expanded": {
                        margin: "0 0 12px 0",
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: section.color }} />}
                      sx={{
                        px: 2,
                        py: 1.5,
                        "&.Mui-expanded": {
                          minHeight: 48,
                        },
                        "& .MuiAccordionSummary-content": {
                          margin: "12px 0",
                          "&.Mui-expanded": {
                            margin: "12px 0",
                          },
                        },
                      }}
                    >
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        width="100%"
                        pr={2}
                      >
                        <Box display="flex" alignItems="center" gap={1.5} flex={1}>
                          <Checkbox
                            checked={tempVisibleSections.has(section.key)}
                            onChange={(e) => handleSectionChange(section.key, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                              color: section.color,
                              "&.Mui-checked": {
                                color: section.color,
                              },
                            }}
                          />
                          <SectionIcon
                            sx={{
                              fontSize: 20,
                              color: section.color,
                            }}
                          />
                          <Box>
                            <Typography
                              variant="subtitle1"
                              fontWeight={600}
                              sx={{
                                fontSize: "0.9375rem",
                                color: "text.primary",
                              }}
                            >
                              {section.label}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontSize: "0.75rem",
                              }}
                            >
                              {section.description}
                              {totalKPICount > 0 && ` • ${selectedKPICount} of ${totalKPICount} KPIs`}
                              {totalChartCount > 0 && ` • ${selectedChartCount} of ${totalChartCount} charts`}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
                      <Box sx={{ pl: 4.5 }}>
                        {/* KPIs Section */}
                        {sectionKPIs.length > 0 && (
                          <Box mb={sectionCharts.length > 0 ? 3 : 0}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ fontSize: "0.875rem" }}
                              >
                                KPIs displayed in this section:
                              </Typography>
                              <Box display="flex" gap={1}>
                                <Checkbox
                                  checked={allKPIsSelected}
                                  indeterminate={someKPIsSelected}
                                  onChange={(e) =>
                                    handleDashboardSectionKPIsChange(section.key, e.target.checked)
                                  }
                                  size="small"
                                  sx={{
                                    color: section.color,
                                    "&.Mui-checked": {
                                      color: section.color,
                                    },
                                    "&.MuiCheckbox-indeterminate": {
                                      color: section.color,
                                    },
                                  }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                                  {allKPIsSelected ? "Deselect All" : someKPIsSelected ? "Select All" : "Select All"}
                                </Typography>
                              </Box>
                            </Box>
                            <Box display="flex" flexDirection="column" gap={1}>
                              {sectionKPIs.map((key) => {
                                const metadata = KPI_METADATA[key];
                                const kpi = dashboardData?.kpis?.[key];
                                const isAvailable = !!kpi;

                                return (
                                  <FormControlLabel
                                    key={key}
                                    control={
                                      <Checkbox
                                        checked={tempSelectedKPIs.has(key)}
                                        onChange={(e) =>
                                          handleKPIChange(key, e.target.checked)
                                        }
                                        disabled={!isAvailable}
                                        size="small"
                                        sx={{
                                          color: section.color,
                                          "&.Mui-checked": {
                                            color: section.color,
                                          },
                                          "&.Mui-disabled": {
                                            color: theme.palette.grey[400],
                                          },
                                        }}
                                      />
                                    }
                                    label={
                                      <Box
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        width="100%"
                                      >
                                        <Box>
                                          <Typography
                                            variant="body2"
                                            fontWeight={500}
                                            sx={{ fontSize: "0.875rem" }}
                                          >
                                            {metadata.label}
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontSize: "0.7rem" }}
                                          >
                                            {metadata.source}
                                          </Typography>
                                        </Box>
                                        {!isAvailable && (
                                          <Chip
                                            label="Not Available"
                                            size="small"
                                            sx={{
                                              height: 18,
                                              fontSize: "0.65rem",
                                              bgcolor: theme.palette.grey[100],
                                              color: theme.palette.grey[600],
                                            }}
                                          />
                                        )}
                                      </Box>
                                    }
                                    sx={{
                                      mb: 0.5,
                                      width: "100%",
                                      opacity: isAvailable ? 1 : 0.6,
                                      alignItems: "flex-start",
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          </Box>
                        )}

                        {/* Charts/Visualizations Section */}
                        {sectionCharts.length > 0 && (
                          <Box>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ fontSize: "0.875rem" }}
                              >
                                Charts & Visualizations:
                              </Typography>
                              <Box display="flex" gap={1}>
                                <Checkbox
                                  checked={allChartsSelected}
                                  indeterminate={someChartsSelected}
                                  onChange={(e) => {
                                    const newSelected = new Set(tempSelectedCharts);
                                    if (e.target.checked) {
                                      sectionCharts.forEach((chart) => newSelected.add(chart.key));
                                    } else {
                                      sectionCharts.forEach((chart) => newSelected.delete(chart.key));
                                    }
                                    setTempSelectedCharts(newSelected);
                                  }}
                                  size="small"
                                  sx={{
                                    color: section.color,
                                    "&.Mui-checked": {
                                      color: section.color,
                                    },
                                    "&.MuiCheckbox-indeterminate": {
                                      color: section.color,
                                    },
                                  }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                                  {allChartsSelected ? "Deselect All" : someChartsSelected ? "Select All" : "Select All"}
                                </Typography>
                              </Box>
                            </Box>
                            <Box display="flex" flexDirection="column" gap={1}>
                              {sectionCharts.map((chart) => {
                                const isChartSelected = tempSelectedCharts.has(chart.key);
                                return (
                                  <FormControlLabel
                                    key={chart.key}
                                    control={
                                      <Checkbox
                                        checked={isChartSelected}
                                        onChange={(e) => {
                                          const newSelected = new Set(tempSelectedCharts);
                                          if (e.target.checked) {
                                            newSelected.add(chart.key);
                                          } else {
                                            newSelected.delete(chart.key);
                                          }
                                          setTempSelectedCharts(newSelected);
                                        }}
                                        size="small"
                                        sx={{
                                          color: section.color,
                                          "&.Mui-checked": {
                                            color: section.color,
                                          },
                                        }}
                                      />
                                    }
                                    label={
                                      <Box>
                                        <Typography
                                          variant="body2"
                                          fontWeight={500}
                                          sx={{ fontSize: "0.875rem" }}
                                        >
                                          {chart.label}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{ fontSize: "0.7rem" }}
                                        >
                                          {chart.description}
                                        </Typography>
                                      </Box>
                                    }
                                    sx={{
                                      mb: 0.5,
                                      width: "100%",
                                      alignItems: "flex-start",
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          </Box>
                        )}

                        {sectionKPIs.length === 0 && sectionCharts.length === 0 && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontSize: "0.875rem", fontStyle: "italic" }}
                          >
                            This section has no selectable KPIs or charts.
                          </Typography>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}
        >
          <Button
            onClick={() => {
              setTempSelectedKPIs(new Set(selectedKPIs));
              setTempVisibleSections(new Set(visibleSections));
              setTempSelectedCharts(new Set(selectedCharts));
              setShowKPISelector(false);
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveKPISelection}
            variant="contained"
            disabled={tempVisibleSections.size === 0}
            sx={{
              bgcolor: theme.palette.primary.main,
              "&:hover": {
                bgcolor: theme.palette.primary.dark,
              },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          Share Public Dashboard
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Share this URL with clients to give them access to the public
            reporting dashboard for this brand.
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <LinkIcon sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography
              variant="body2"
              sx={{
                flex: 1,
                fontFamily: "monospace",
                fontSize: "0.875rem",
                wordBreak: "break-all",
                color: "text.primary",
              }}
            >
              {shareableUrl}
            </Typography>
            <IconButton
              onClick={handleCopyUrl}
              size="small"
              sx={{
                color: copied ? theme.palette.success.main : "text.secondary",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
              title={copied ? "Copied!" : "Copy URL"}
            >
              {copied ? (
                <CheckIcon fontSize="small" />
              ) : (
                <ContentCopyIcon fontSize="small" />
              )}
            </IconButton>
          </Box>
          {copied && (
            <Typography
              variant="caption"
              color="success.main"
              sx={{ mt: 1, display: "block", fontWeight: 600 }}
            >
              URL copied to clipboard!
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setShowShareDialog(false)}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ReportingDashboard;
