import { Container, Box, Button, Typography, Divider, IconButton, Tooltip } from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { useEffect, useRef, useState } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axios from 'axios';
import LoadingOverlay from 'react-loading-overlay-ts';
import { toast } from 'react-toastify';
import { getSignature, SignatureExpiredError, handleSessionExpired } from 'src/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import { ADMIN_ADDRESS } from 'src/config';
import { AnalyzeTeamVolumeResponse, HourlyVolume, TeamVolumeTotal, TopTokenVolumeUsd1h, VolumeByTeam24 } from './types';
import { useNavigate } from 'react-router';
import { LineChart } from '@mui/x-charts/LineChart';
import type { ChartsAxisContentProps } from '@mui/x-charts/ChartsTooltip';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import type { DefaultizedLineSeriesType } from '@mui/x-charts/models';

const ADMIN_DASHBOARD_API_KEY = process.env.REACT_APP_ADMIN_DASHBOARD_API_KEY;

const formatVolumeSol = (v: number | null | undefined) =>
	`${Number(v ?? 0).toFixed(2)} SOL`;

const lamportsToSol = (volume: string | number | undefined) => Number(volume ?? 0) / Math.pow(10, 9);

const parseRecordSol = (item: VolumeByTeam24) => {
	if (item.volume_sol != null && item.volume_sol !== '') return Number(item.volume_sol);
	return lamportsToSol(item.volume);
};

const parseRecordUsd = (item: VolumeByTeam24) => {
	if (item.volume_usd != null && item.volume_usd !== '') return Number(item.volume_usd);
	return 0;
};

const totalRowSol = (row: TeamVolumeTotal) => {
	if (row.volume_sol != null && row.volume_sol !== '') return Number(row.volume_sol);
	return lamportsToSol(row.volume);
};

const totalRowUsd = (row: TeamVolumeTotal) => {
	if (row.volume_usd != null && row.volume_usd !== '') return Number(row.volume_usd);
	return 0;
};

const totalRowAverageDailySol = (row: TeamVolumeTotal) => {
	if (row.average_daily_volume != null && row.average_daily_volume !== '') return lamportsToSol(row.average_daily_volume);
	return 0;
};

const totalRowAverageDailyUsd = (row: TeamVolumeTotal) => {
	if (row.average_daily_volume_usd != null && row.average_daily_volume_usd !== '') return Number(row.average_daily_volume_usd);
	return 0;
};

const parseRecordTradeCount = (item: VolumeByTeam24) => {
	if (item.trade_count != null && item.trade_count !== '') return Number(item.trade_count);
	return 0;
};

const totalRowTradeCount = (row: TeamVolumeTotal) => {
	if (row.trade_count != null && row.trade_count !== '') return Number(row.trade_count);
	return 0;
};

const parseRecordActiveUserCount = (item: VolumeByTeam24) => {
	if (item.active_user_count != null && item.active_user_count !== '') return Number(item.active_user_count);
	return 0;
};

const totalRowActiveUserCount = (row: TeamVolumeTotal) => {
	if (row.active_user_count != null && row.active_user_count !== '') return Number(row.active_user_count);
	return 0;
};

const parseHourlySol = (row: HourlyVolume | null) => {
	if (!row) return 0;
	return lamportsToSol(row.volume);
};

const parseHourlyUsd = (row: HourlyVolume | null) => {
	if (!row) return 0;
	return Number(row.volume_usd ?? 0);
};

const parseHourlyTradeCount = (row: HourlyVolume | null) => {
	if (!row) return 0;
	return Number(row.trade_count ?? 0);
};

const parseHourlyActiveUserCount = (row: HourlyVolume | null) => {
	if (!row) return 0;
	return Number(row.active_user_count ?? 0);
};

const formatTradeCount = (n: number) => {
	const v = Math.round(Number(n));
	if (Number.isNaN(v)) return '0 trades';
	return `${v.toLocaleString('en-US')} trades`;
};

const formatActiveUserCount = (n: number) => {
	const v = Math.round(Number(n));
	if (Number.isNaN(v)) return "0 users";
	return v.toLocaleString("en-US") + " " + (v === 1 ? "user" : "users");
};

const formatUsd = (volumeUsd: string | number | undefined) => {
	const n = Number(volumeUsd ?? 0);
	if (Number.isNaN(n)) return String(volumeUsd ?? '');
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
};

const DATE_FORMAT = 'yyyy-MM-dd';

const formatDateForSpreadsheet = (date: Date | null | undefined) => {
	if (!date) return '';
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const formatNumberForSpreadsheet = (value: number, fractionDigits = 6) => {
	if (!Number.isFinite(value)) return '0';
	return value.toFixed(fractionDigits);
};

const escapeCsvValue = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const downloadCsv = (filename: string, rows: Array<Array<string | number | null | undefined>>) => {
	const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join(String.fromCharCode(10));
	const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

const TEAM_CHART_PALETTE = [
	'#2DD4D1',
	'#facc15',
	'#fb7185',
	'#60a5fa',
	'#34d399',
	'#f97316',
	'#a78bfa',
	'#f472b6',
	'#22c55e',
	'#38bdf8',
	'#e879f9',
	'#fb923c',
	'#84cc16',
	'#c084fc',
	'#06b6d4',
	'#ef4444',
	'#10b981',
	'#f59e0b',
	'#818cf8',
	'#14b8a6',
];

const getStableTeamColor = (team: string) => {
	let hash = 0;
	for (let i = 0; i < team.length; i += 1) {
		hash = (hash * 31 + team.charCodeAt(i)) >>> 0;
	}
	return TEAM_CHART_PALETTE[hash % TEAM_CHART_PALETTE.length];
};

const parseLifetimeStartDate = (value: string | null | undefined) => {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function isLineSeries(seriesItem: ChartsAxisContentProps['series'][number]): seriesItem is DefaultizedLineSeriesType {
	return seriesItem.type === 'line';
}

function makeTeamsAxisTooltip(formatValue: (n: number) => string) {
	return function TeamsAxisTooltipContent({
		series,
		axis,
		dataIndex,
		axisValue,
		sx,
		classes: _classes,
	}: ChartsAxisContentProps) {
		if (dataIndex == null) return null;
		const axisFormatter = axis.valueFormatter ?? ((v: unknown) => String(v));
		const rows = series
			.filter(isLineSeries)
			.map((s) => {
				const raw = s.data?.[dataIndex];
				const num = raw == null || Number.isNaN(Number(raw)) ? 0 : Number(raw);
				const formatted = s.valueFormatter ? s.valueFormatter(num) : formatValue(num);
				if (formatted == null) return null;
				return { id: s.id, label: s.label ?? String(s.id), color: s.color, formatted, num };
			})
			.filter(Boolean) as Array<{
				id?: string | number;
				label?: string;
				color?: string;
				formatted: string;
				num: number;
			}>;

		const total = rows.reduce((sum, r) => sum + r.num, 0);

		return (
			<Box
				sx={{
					bgcolor: 'rgba(18,18,20,0.96)',
					border: '1px solid rgba(255,255,255,0.12)',
					borderRadius: 1,
					px: 1.5,
					py: 1.25,
					minWidth: 220,
					...sx,
				}}
			>
				{axisValue != null && !axis.hideTooltip && (
					<Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
						{axisFormatter(axisValue)}
					</Typography>
				)}
				{rows.map((row) => (
					<Box
						key={row.id ?? row.label}
						sx={{
							display: 'grid',
							gridTemplateColumns: '1fr auto',
							alignItems: 'baseline',
							columnGap: 1.5,
							py: 0.35,
						}}
					>
						<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', textAlign: 'left' }}>
							{row.label}
						</Typography>
						<Typography
							variant="body2"
							sx={{
								color: row.color ?? 'rgba(255,255,255,0.95)',
								textAlign: 'left',
								fontVariantNumeric: 'tabular-nums',
							}}
						>
							{row.formatted}
						</Typography>
					</Box>
				))}
				<Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
				<Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 1.5, alignItems: 'baseline' }}>
					<Typography variant="body2" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)', textAlign: 'left' }}>
						Total
					</Typography>
					<Typography variant="body2" sx={{ fontWeight: 700, color: '#34d399', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>
						{formatValue(total)}
					</Typography>
				</Box>
			</Box>
		);
	};
}

const TeamsAxisTooltipSol = makeTeamsAxisTooltip((n) => formatVolumeSol(n));
const TeamsAxisTooltipUsd = makeTeamsAxisTooltip((n) => formatUsd(n));
const TeamsAxisTooltipTrades = makeTeamsAxisTooltip((n) => formatTradeCount(n));
const TeamsAxisTooltipActiveUsers = makeTeamsAxisTooltip((n) => formatActiveUserCount(n));

const Analyze = () => {
  	const [loading, setLoading] = useState(true);
	const [appeared, setAppeared] = useState(false);
	const firstLoad = useRef(true);
	const [hidden, setHidden] = useState(true);

	const mask = (val: string) => hidden ? '•••••' : val;
	const [teamsVolume, setTeamsVolume] = useState<VolumeByTeam24[]>([]);
	const [teamTotals, setTeamTotals] = useState<TeamVolumeTotal[]>([]);
	const [hourlyVolume, setHourlyVolume] = useState<HourlyVolume | null>(null);
	const [topTokens1h, setTopTokens1h] = useState<TopTokenVolumeUsd1h[]>([]);
	const [missedDepositsCount, setMissedDepositsCount] = useState<number>(0);
	const [lifetimeStartAt, setLifetimeStartAt] = useState<Date | null>(null);
	const [preset, setPreset] = useState<'week' | 'month' | 'lifetime' | null>('week');
	const [startAt, setStartAt] = useState<Date | null>(() => {
		const d = new Date();
		d.setDate(d.getDate() - 7);
		return d;
	});
	const [endAt, setEndAt] = useState<Date | null>(() => new Date());

	const applyPreset = (p: 'week' | 'month' | 'lifetime') => {
		setPreset(p);
		const now = new Date();
		if (p === 'week') { const d = new Date(); d.setDate(d.getDate() - 7); setStartAt(d); setEndAt(now); }
		if (p === 'month') { const d = new Date(); d.setDate(d.getDate() - 30); setStartAt(d); setEndAt(now); }
		if (p === 'lifetime') {
			if (!lifetimeStartAt) return;
			setStartAt(lifetimeStartAt);
			setEndAt(now);
		}
	};

	const { signMessage, publicKey } = useWallet();
	const navigate = useNavigate();
	const records = Array.isArray(teamsVolume) ? teamsVolume : [];
	const chartXAxis = Array.from(
		new Set(records.map((item) => (item as any).day).filter((day): day is string => Boolean(day)))
	).sort();
	const chartTeams = Array.from(new Set(records.map((item) => String(item.team ?? item.team_name ?? '-'))));
	const volumeByTeamDaySol = new Map<string, number>();
	const volumeByTeamDayUsd = new Map<string, number>();
	const volumeByTeamDayTrades = new Map<string, number>();
	const activeUsersByTeamDay = new Map<string, number>();
	records.forEach((item) => {
		const day = (item as any).day as string | undefined;
		const team = String(item.team ?? item.team_name ?? '-');
		if (!day) return;
		const key = `${team}__${day}`;
		volumeByTeamDaySol.set(key, (volumeByTeamDaySol.get(key) ?? 0) + parseRecordSol(item));
		volumeByTeamDayUsd.set(key, (volumeByTeamDayUsd.get(key) ?? 0) + parseRecordUsd(item));
		volumeByTeamDayTrades.set(key, (volumeByTeamDayTrades.get(key) ?? 0) + parseRecordTradeCount(item));
		activeUsersByTeamDay.set(key, (activeUsersByTeamDay.get(key) ?? 0) + parseRecordActiveUserCount(item));
	});
	const chartSeries = chartTeams.map((team) => ({
		label: team,
		data: chartXAxis.map((day) => volumeByTeamDaySol.get(`${team}__${day}`) ?? 0),
		area: true as const,
		showMark: false,
		color: getStableTeamColor(team),
		curve: 'monotoneX' as const,
		stack: 'total',
		valueFormatter: (value: number | null) =>
			value == null || Number.isNaN(Number(value)) ? null : formatVolumeSol(Number(value)),
	}));
	const chartSeriesUsd = chartTeams.map((team) => ({
		label: team,
		data: chartXAxis.map((day) => volumeByTeamDayUsd.get(`${team}__${day}`) ?? 0),
		area: true as const,
		showMark: false,
		color: getStableTeamColor(team),
		curve: 'monotoneX' as const,
		stack: 'total',
		valueFormatter: (value: number | null) =>
			value == null || Number.isNaN(Number(value)) ? null : formatUsd(Number(value)),
	}));
	const chartSeriesTrades = chartTeams.map((team) => ({
		label: team,
		data: chartXAxis.map((day) => volumeByTeamDayTrades.get(`${team}__${day}`) ?? 0),
		area: true as const,
		showMark: false,
		color: getStableTeamColor(team),
		curve: 'monotoneX' as const,
		stack: 'total',
		valueFormatter: (value: number | null) =>
			value == null || Number.isNaN(Number(value)) ? null : formatTradeCount(Number(value)),
	}));

	const chartSeriesActiveUsers = chartTeams.map((team) => ({
		label: team,
		data: chartXAxis.map((day) => activeUsersByTeamDay.get(team + "__" + day) ?? 0),
		area: true as const,
		showMark: false,
		color: getStableTeamColor(team),
		curve: 'monotoneX' as const,
		stack: 'total',
		valueFormatter: (value: number | null) =>
			value == null || Number.isNaN(Number(value)) ? null : formatActiveUserCount(Number(value)),
	}));

	const teamTotalsSorted = [...teamTotals].sort((a, b) => totalRowSol(b) - totalRowSol(a));
	const rangeLabel = preset === 'lifetime'
		? 'lifetime'
		: preset === 'month'
			? '30 days'
			: preset === 'week'
				? '7 days'
				: 'custom range';

	const fetchTeamsVolume = async () => {
		setLoading(true);
		try {
			const {super_admin_signature, timestamp} = await getSignature(signMessage || undefined, 'read');
			const basePayload = {
				admin_address: localStorage.getItem(ADMIN_ADDRESS),
				timestamp: timestamp,
				admin_signature: super_admin_signature,
				start_at: startAt
					? new Date(
						startAt.getFullYear(),
						startAt.getMonth(),
						startAt.getDate(),
						0,
						0,
						0,
						0
					).toISOString()
					: new Date().toISOString(),
				end_at: endAt
					? new Date(
						endAt.getFullYear(),
						endAt.getMonth(),
						endAt.getDate(),
						23,
						59,
						59,
						999
					).toISOString()
					: new Date().toISOString(),
			};
			const response = await axios.post<AnalyzeTeamVolumeResponse>(
			`${process.env.REACT_APP_API_BASE_URL}/admin/analyze/teams_volume`,
			basePayload,
			{
				headers: {
				'Content-Type': 'application/json',
				'accept': 'application/json',
				'x-api-key': ADMIN_DASHBOARD_API_KEY,
				},
			}
			);

			console.log('Teams Volume:', response.data);
			const data = response.data;
			setLifetimeStartAt(parseLifetimeStartDate(data?.lifetime_start_at));
			if (Array.isArray(data)) {
				setTeamsVolume(data);
				setTeamTotals([]);
				setHourlyVolume(null);
				setTopTokens1h([]);
				setMissedDepositsCount(0);
			} else {
				const teams = data?.teams_volume ?? data?.teams ?? [];
				setTeamsVolume(Array.isArray(teams) ? teams : []);
				const rawTotals = data?.team_totals;
				setTeamTotals(
					Array.isArray(rawTotals)
						? rawTotals
								.map((row) => {
									return {
										team: String(row.team ?? ''),
										volume: String(row.volume ?? '0'),
										volume_sol: row.volume_sol != null && row.volume_sol !== '' ? String(row.volume_sol) : undefined,
										volume_usd: row.volume_usd != null && row.volume_usd !== '' ? String(row.volume_usd) : undefined,
										average_daily_volume: row.average_daily_volume != null && row.average_daily_volume !== '' ? String(row.average_daily_volume) : undefined,
										average_daily_volume_usd: row.average_daily_volume_usd != null && row.average_daily_volume_usd !== '' ? String(row.average_daily_volume_usd) : undefined,
										trade_count: row.trade_count != null && row.trade_count !== '' ? String(row.trade_count) : undefined,
										active_user_count: row.active_user_count != null && row.active_user_count !== '' ? String(row.active_user_count) : undefined,
									};
								})
								.filter((row) => row.team)
						: []
				);
				const rawHourlyVolume = data?.hourly_volume;
				setHourlyVolume(rawHourlyVolume ? {
					volume: String(rawHourlyVolume.volume ?? '0'),
					volume_usd: String(rawHourlyVolume.volume_usd ?? '0'),
					trade_count: rawHourlyVolume.trade_count ?? 0,
					active_user_count: rawHourlyVolume.active_user_count ?? 0,
				} : null);
				const rawTopTokens = data?.top_tokens_1h_volume_usd;
				const parsedTop: TopTokenVolumeUsd1h[] = Array.isArray(rawTopTokens)
					? rawTopTokens
							.map((row) => ({
								token_address: String(row.token_address ?? ''),
								ticker: String(row.ticker ?? ''),
								volume_usd: String(row.volume_usd ?? '0'),
							}))
							.filter((row) => row.token_address)
					: [];
				parsedTop.sort((a, b) => Number(b.volume_usd) - Number(a.volume_usd));
				setTopTokens1h(parsedTop.slice(0, 10));
				setMissedDepositsCount(Number(data?.missed_deposits_count ?? 0));
			}
			setLoading(false);
			if (firstLoad.current) { firstLoad.current = false; setAppeared(true); }
		} catch (err: any) {
			console.error('Error getting teams volume', err);
			setLoading(false);
			if (firstLoad.current) { firstLoad.current = false; setAppeared(true); }
			if (err instanceof SignatureExpiredError) {
				handleSessionExpired(navigate);
				return;
			}
			toast.error(err.message, {

				autoClose: 1500
			});
		}
	};
	
	useEffect(() => {
		if (!startAt || !endAt) return;
		fetchTeamsVolume();
	}, [signMessage, startAt, endAt]);

	const copyTokenAddress = async (address: string) => {
		try {
			await navigator.clipboard.writeText(address);
			toast.success('Token address copied', {

				autoClose: 1500,
			});
		} catch {
			toast.error('Could not copy address', {

				autoClose: 1500,
			});
		}
	};


	const exportAnalyzeSpreadsheet = () => {
		if (teamTotalsSorted.length === 0 && records.length === 0) {
			toast.info('No analyze data to export', { autoClose: 1500 });
			return;
		}

		const startDate = formatDateForSpreadsheet(startAt);
		const endDate = formatDateForSpreadsheet(endAt);
		const generatedAt = new Date().toISOString();
		const rows: Array<Array<string | number>> = [[
			'Section',
			'Timeframe',
			'Start Date',
			'End Date',
			'Day',
			'Team',
			'Volume SOL',
			'Volume USD',
			'Average Daily Volume SOL',
			'Average Daily Volume USD',
			'Trade Count',
			'Active Users',
			'Generated At',
		]];

		teamTotalsSorted.forEach((row) => {
			rows.push([
				'Team Total',
				rangeLabel,
				startDate,
				endDate,
				'',
				row.team,
				formatNumberForSpreadsheet(totalRowSol(row)),
				formatNumberForSpreadsheet(totalRowUsd(row), 2),
				formatNumberForSpreadsheet(totalRowAverageDailySol(row)),
				formatNumberForSpreadsheet(totalRowAverageDailyUsd(row), 2),
				Math.round(totalRowTradeCount(row)),
				Math.round(totalRowActiveUserCount(row)),
				generatedAt,
			]);
		});

		[...records]
			.sort((a, b) => {
				const dayCompare = String((a as any).day ?? '').localeCompare(String((b as any).day ?? ''));
				if (dayCompare !== 0) return dayCompare;
				return String(a.team ?? a.team_name ?? '').localeCompare(String(b.team ?? b.team_name ?? ''));
			})
			.forEach((row) => {
				rows.push([
					'Daily Team Volume',
					rangeLabel,
					startDate,
					endDate,
					String((row as any).day ?? ''),
					String(row.team ?? row.team_name ?? '-'),
					formatNumberForSpreadsheet(parseRecordSol(row)),
					formatNumberForSpreadsheet(parseRecordUsd(row), 2),
					'',
					'',
					Math.round(parseRecordTradeCount(row)),
					Math.round(parseRecordActiveUserCount(row)),
					generatedAt,
				]);
			});

		const safeRange = rangeLabel.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase();
		downloadCsv(`analyze_${safeRange || 'custom'}_${startDate || 'start'}_to_${endDate || 'end'}.csv`, rows);
		toast.success('Analyze spreadsheet exported', { autoClose: 1500 });
	};

	return (
		<main>
			<Container maxWidth="xl">
				<LoadingOverlay
					active={loading}
					spinner
					styles={{
					wrapper: (base) => ({
						...base,
						width: '100%'
					})
					}}
				>
					<Box sx={{
						pt: 1,
						'@keyframes analyzeIn': {
							'0%':   { opacity: 0, transform: 'translateY(14px)' },
							'100%': { opacity: 1, transform: 'translateY(0)' },
						},
						animation: appeared ? 'analyzeIn 0.55s cubic-bezier(0.22,1,0.36,1) both' : undefined,
					}}>
						<div>
							<Box
								sx={{
									display: 'flex',
									flexDirection: 'column',
									gap: 2,
									width: '100%',
								}}
							>
								<Card
									sx={{
										width: '100%',
										overflow: 'hidden',
										borderRadius: 2,
										bgcolor: 'rgba(255,255,255,0.02)',
										border: '1px solid rgba(255,255,255,0.08)',
										boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
									}}
								>
									<CardContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3.5 }, '&:last-child': { pb: { xs: 2.5, sm: 3.5 } } }}>
										<Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: { xs: 1.5, md: 2 }, mb: 3 }}>
											<h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.02em' }}>
												Teams With Volume
											</h3>
											<Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
												<IconButton
													size="small"
													onClick={() => setHidden(h => !h)}
													sx={{
														color: hidden ? 'rgba(255,255,255,0.28)' : 'rgba(45,212,209,0.7)',
														'&:hover': { color: hidden ? 'rgba(255,255,255,0.6)' : '#2DD4D1' },
														p: 0.5,
													}}
												>
													{hidden ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
												</IconButton>
												{(['week', 'month', 'lifetime'] as const).map((p) => {
													const button = (
														<Button
															key={p}
															variant="outlined"
															size="small"
															onClick={() => applyPreset(p)}
															disabled={p === 'lifetime' && !lifetimeStartAt}
															sx={{
																fontSize: 11, height: 36, fontWeight: 600, whiteSpace: 'nowrap',
																borderColor: preset === p ? '#2DD4D1' : 'rgba(255,255,255,0.15)',
																color: preset === p ? '#2DD4D1' : 'rgba(255,255,255,0.6)',
																bgcolor: preset === p ? 'rgba(45,212,209,0.08)' : 'transparent',
																'&:hover': { borderColor: '#2DD4D1', color: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.06)' },
															}}
														>
															{p === 'week' ? '7 Days' : p === 'month' ? '30 Days' : 'Lifetime'}
														</Button>
													);

													if (p !== 'lifetime') return button;

													return (
														<Tooltip
															key={p}
															title={lifetimeStartAt
																? `From ${lifetimeStartAt.toLocaleDateString()} to today`
																: 'Loading first trade date...'}
														>
															<span>{button}</span>
														</Tooltip>
													);
												})}
												<DatePicker
													label="Start"
													value={startAt}
													onChange={(date) => { setPreset(null); setStartAt(date); }}
													maxDate={endAt ?? undefined}
													format={DATE_FORMAT}
													slotProps={{
														textField: {
															size: 'small',
															InputLabelProps: { shrink: true },
															sx: {
																width: 150,
																'& .MuiOutlinedInput-root': {
																	height: 36,
																	bgcolor: 'rgba(255,255,255,0.04)',
																	fontSize: 13,
																	'& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
																	'&:hover fieldset': { borderColor: 'rgba(45,212,209,0.4)' },
																	'&.Mui-focused fieldset': { borderColor: '#2DD4D1', borderWidth: 1 },
																},
																'& .MuiInputBase-input': { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
																'& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
																'& .MuiInputLabel-root.Mui-focused': { color: '#2DD4D1' },
															},
														},
													}}
												/>
												<DatePicker
													label="End"
													value={endAt}
													onChange={(date) => { setPreset(null); setEndAt(date); }}
													minDate={startAt ?? undefined}
													maxDate={new Date()}
													format={DATE_FORMAT}
													slotProps={{
														textField: {
															size: 'small',
															InputLabelProps: { shrink: true },
															sx: {
																width: 150,
																'& .MuiOutlinedInput-root': {
																	height: 36,
																	bgcolor: 'rgba(255,255,255,0.04)',
																	fontSize: 13,
																	'& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
																	'&:hover fieldset': { borderColor: 'rgba(45,212,209,0.4)' },
																	'&.Mui-focused fieldset': { borderColor: '#2DD4D1', borderWidth: 1 },
																},
																'& .MuiInputBase-input': { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
																'& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
																'& .MuiInputLabel-root.Mui-focused': { color: '#2DD4D1' },
															},
														},
													}}
												/>
											<Button
												variant="outlined"
												size="small"
												startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
												onClick={exportAnalyzeSpreadsheet}
												disabled={loading || (teamTotalsSorted.length === 0 && records.length === 0)}
												sx={{
													fontSize: 11, height: 36, fontWeight: 600, whiteSpace: 'nowrap',
													borderColor: 'rgba(45,212,209,0.3)',
													color: '#2DD4D1',
													'&:hover': { borderColor: '#2DD4D1', bgcolor: 'rgba(45,212,209,0.06)' },
												}}
											>
												Export CSV
											</Button>
										</Box>
									</Box>
									<Box
										sx={{
											display: 'flex',
											gap: 3,
											alignItems: 'flex-start',
											flexDirection: { xs: 'column', md: 'row' },
											mb: 3,
										}}
									>
											<Box
												sx={{
													flexShrink: 0,
													width: '100%',
											maxWidth: { xs: '100%', md: 300 },
													overflow: 'hidden',
													p: 2,
													borderRadius: 1,
													bgcolor: 'rgba(255,255,255,0.03)',
												}}
											>
												<Typography
													variant="caption"
													sx={{
														display: 'block',
														mb: 1.5,
														color: 'rgba(255,255,255,0.55)',
														fontWeight: 600,
														textTransform: 'uppercase',
														letterSpacing: '0.06em',
													}}
												>
													Volume by team ({rangeLabel})
												</Typography>
												{teamTotalsSorted.length === 0 ? (
													<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
														No totals for this range
													</Typography>
												) : (
													teamTotalsSorted.map((row) => {
														const color = getStableTeamColor(row.team);
														return (
															<Box
																key={row.team}
																sx={{
																	display: 'grid',
																	gridTemplateColumns: '1fr auto',
																	alignItems: 'baseline',
																	columnGap: 1,
																	py: 0.5,
																	borderBottom: '1px solid rgba(255,255,255,0.06)',
																	'&:last-of-type': { borderBottom: 'none' },
																}}
															>
																<Typography
																	variant="body2"
																	sx={{
																		color: 'rgba(255,255,255,0.88)',
																		textAlign: 'left',
																		pr: 1,
																	}}
																>
																	<Box
																		component="span"
																		sx={{
																			display: 'inline-block',
																			width: 8,
																			height: 8,
																			borderRadius: '50%',
																			mr: 1,
																			verticalAlign: 'middle',
																			bgcolor: color,
																		}}
																	/>
																	{row.team}
																</Typography>
																<Box sx={{ textAlign: 'right' }}>
																	<Typography
																		variant="body2"
																		sx={{
																			color: 'rgba(255,255,255,0.95)',
																			fontVariantNumeric: 'tabular-nums',
																			fontWeight: 600,
																			display: 'block',
																			lineHeight: 1.35,
																		}}
																	>
																		{mask(formatVolumeSol(totalRowSol(row)))}
																	</Typography>
																	<Typography
																		variant="caption"
																		sx={{
																			color: 'rgba(255,255,255,0.55)',
																			fontVariantNumeric: 'tabular-nums',
																			display: 'block',
																		}}
																	>
																		{mask(formatUsd(totalRowUsd(row)))}
																	</Typography>
																			<Typography
																				variant="caption"
																				sx={{ color: "rgba(45,212,209,0.72)", fontVariantNumeric: "tabular-nums", display: "block" }}
																			>
																				Avg/day: {mask(formatVolumeSol(totalRowAverageDailySol(row)))}
																			</Typography>
																			<Typography
																				variant="caption"
																				sx={{ color: "rgba(255,255,255,0.48)", fontVariantNumeric: "tabular-nums", display: "block" }}
																			>
																				{mask(formatUsd(totalRowAverageDailyUsd(row)))}
																			</Typography>
																	<Typography
																		variant="caption"
																		sx={{
																			color: 'rgba(255,255,255,0.45)',
																			fontVariantNumeric: 'tabular-nums',
																			display: 'block',
																		}}
																	>
																		{formatTradeCount(totalRowTradeCount(row))}
																	</Typography>
																		<Typography variant="caption" sx={{ color: "rgba(45,212,209,0.72)", fontVariantNumeric: "tabular-nums", display: "block" }}>
																			{formatActiveUserCount(totalRowActiveUserCount(row))}
																		</Typography>
																</Box>
															</Box>
														);
													})
												)}

												{/* ── Period Total ── */}
												{teamTotalsSorted.length > 0 && (
													<Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
														<Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'baseline', columnGap: 1 }}>
															<Typography variant="body2" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>
																{preset === 'lifetime' ? 'Lifetime Total' : 'Total'}
															</Typography>
															<Box sx={{ textAlign: 'right' }}>
																<Typography variant="body2" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)', fontVariantNumeric: 'tabular-nums', display: 'block', lineHeight: 1.35 }}>
																	{mask(formatVolumeSol(teamTotalsSorted.reduce((s, r) => s + totalRowSol(r), 0)))}
																</Typography>
																<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontVariantNumeric: 'tabular-nums', display: 'block' }}>
																	{mask(formatUsd(teamTotalsSorted.reduce((s, r) => s + totalRowUsd(r), 0)))}
																</Typography>
																	<Typography
																		variant="caption"
																		sx={{ color: "rgba(45,212,209,0.72)", fontVariantNumeric: "tabular-nums", display: "block" }}
																	>
																		Avg/day: {mask(formatVolumeSol(teamTotalsSorted.reduce((s, r) => s + totalRowAverageDailySol(r), 0)))}
																	</Typography>
																	<Typography
																		variant="caption"
																		sx={{ color: "rgba(255,255,255,0.48)", fontVariantNumeric: "tabular-nums", display: "block" }}
																	>
																		{mask(formatUsd(teamTotalsSorted.reduce((s, r) => s + totalRowAverageDailyUsd(r), 0)))}
																	</Typography>
																<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontVariantNumeric: 'tabular-nums', display: 'block' }}>
																	{formatTradeCount(teamTotalsSorted.reduce((s, r) => s + totalRowTradeCount(r), 0))}
																</Typography>
																		<Typography variant="caption" sx={{ color: "rgba(45,212,209,0.72)", fontVariantNumeric: "tabular-nums", display: "block" }}>
																			{formatActiveUserCount(teamTotalsSorted.reduce((s, r) => s + totalRowActiveUserCount(r), 0))}
																		</Typography>
															<Typography variant="caption" sx={{ color: missedDepositsCount > 0 ? '#f87171' : 'rgba(255,255,255,0.45)', fontVariantNumeric: 'tabular-nums', display: 'block' }}>
																{missedDepositsCount.toLocaleString('en-US')} missed deposit{missedDepositsCount === 1 ? '' : 's'}
															</Typography>
															</Box>
														</Box>
													</Box>
												)}

												<Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
													<Typography variant="caption" sx={{ display: 'block', mb: 1.25, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
														Live Hourly Volume
													</Typography>
													<Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'baseline', columnGap: 1, py: 0.4 }}>
														<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', textAlign: 'left' }}>
															Last 1H
														</Typography>
														<Box sx={{ textAlign: 'right' }}>
															<Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', display: 'block', lineHeight: 1.35 }}>
																{mask(formatVolumeSol(parseHourlySol(hourlyVolume)))}
															</Typography>
															<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontVariantNumeric: 'tabular-nums', display: 'block' }}>
																{mask(formatUsd(parseHourlyUsd(hourlyVolume)))}
															</Typography>
															<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontVariantNumeric: 'tabular-nums', display: 'block' }}>
																{formatTradeCount(parseHourlyTradeCount(hourlyVolume))}
															</Typography>
															<Typography variant="caption" sx={{ color: 'rgba(45,212,209,0.72)', fontVariantNumeric: 'tabular-nums', display: 'block' }}>
																{formatActiveUserCount(parseHourlyActiveUserCount(hourlyVolume))}
															</Typography>
														</Box>
													</Box>
												</Box>

												{/* ── Top 10 Traded Tokens ── */}
												{topTokens1h.length > 0 && (
													<Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
														<Typography variant="caption" sx={{ display: 'block', mb: 1.25, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
															Top Tokens USD (Live - 1H)
														</Typography>
														{topTokens1h.map((row, i) => (
															<Box key={row.token_address} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'baseline', columnGap: 1, py: 0.4, borderBottom: i < topTokens1h.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
																<Box
																	component="button"
																	type="button"
																	onClick={() => copyTokenAddress(row.token_address)}
																	title="Copy token mint address"
																	sx={{ background: 'none', border: 'none', p: 0, m: 0, cursor: 'pointer', color: '#2DD4D1', font: 'inherit', fontSize: 12, fontWeight: 600, textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: 3, '&:hover': { color: 'rgba(45,212,209,0.7)' } }}
																>
																	{row.ticker || '—'}
																</Box>
																<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
																	{mask(formatUsd(row.volume_usd))}
																</Typography>
															</Box>
														))}
													</Box>
												)}
											</Box>
											<Box sx={{ flex: 1, minWidth: 0, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 1.5 }}>
												<Box>
													<Typography
														variant="caption"
														sx={{
															display: 'block',
															mb: 0.75,
															color: 'rgba(255,255,255,0.45)',
															fontWeight: 600,
															textTransform: 'uppercase',
															letterSpacing: '0.06em',
														}}
													>
														Volume (SOL, stacked)
													</Typography>
													<LineChart
														xAxis={[
															{
																scaleType: 'point',
																data: chartXAxis,
															},
														]}
														yAxis={[
															{
																valueFormatter: (value: number) => Number(value).toFixed(2),
																tickLabelStyle: {
																	textAnchor: 'start' as const,
																	fill: 'rgba(255,255,255,0.75)',
																},
															},
														]}
														series={chartSeries}
														height={240}
														tooltip={{ trigger: 'axis' }}
														slots={{ axisContent: TeamsAxisTooltipSol }}
														sx={{
															'& .MuiChartsAxis-tickLabel': { fill: 'rgba(255,255,255,0.75)' },
															'& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: 'rgba(255,255,255,0.25)' },
															'& .MuiChartsLegend-series text': { fill: 'rgba(255,255,255,0.9) !important' },
															'& .MuiChartsGrid-line': { stroke: 'rgba(255,255,255,0.12)' },
														}}
													/>
												</Box>
												<Box>
													<Typography
														variant="caption"
														sx={{
															display: 'block',
															mb: 0.75,
															color: 'rgba(255,255,255,0.45)',
															fontWeight: 600,
															textTransform: 'uppercase',
															letterSpacing: '0.06em',
														}}
													>
														Volume (USD, stacked)
													</Typography>
													<LineChart
														xAxis={[
															{
																scaleType: 'point',
																data: chartXAxis,
																id: 'x-usd',
															},
														]}
														yAxis={[
															{
																valueFormatter: (value: number) => {
																	const n = Number(value);
																	if (Number.isNaN(n)) return '';
																	if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
																	if (Math.abs(n) >= 10_000) return `$${(n / 1_000).toFixed(0)}k`;
																	return new Intl.NumberFormat('en-US', {
																		style: 'currency',
																		currency: 'USD',
																		maximumFractionDigits: 0,
																	}).format(n);
																},
																tickLabelStyle: {
																	textAnchor: 'start' as const,
																	fill: 'rgba(255,255,255,0.75)',
																},
															},
														]}
														series={chartSeriesUsd}
														height={240}
														tooltip={{ trigger: 'axis' }}
														slots={{ axisContent: TeamsAxisTooltipUsd }}
														sx={{
															'& .MuiChartsAxis-tickLabel': { fill: 'rgba(255,255,255,0.75)' },
															'& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: 'rgba(255,255,255,0.25)' },
															'& .MuiChartsLegend-series text': { fill: 'rgba(255,255,255,0.9) !important' },
															'& .MuiChartsGrid-line': { stroke: 'rgba(255,255,255,0.12)' },
														}}
													/>
												</Box>
												<Box>
													<Typography
														variant="caption"
														sx={{
															display: 'block',
															mb: 0.75,
															color: 'rgba(255,255,255,0.45)',
															fontWeight: 600,
															textTransform: 'uppercase',
															letterSpacing: '0.06em',
														}}
													>
														Trades (stacked)
													</Typography>
													<LineChart
														xAxis={[
															{
																scaleType: 'point',
																data: chartXAxis,
																id: 'x-trades',
															},
														]}
														yAxis={[
															{
																valueFormatter: (value: number) =>
																	Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : '',
																tickLabelStyle: {
																	textAnchor: 'start' as const,
																	fill: 'rgba(255,255,255,0.75)',
																},
															},
														]}
														series={chartSeriesTrades}
														height={240}
														tooltip={{ trigger: 'axis' }}
														slots={{ axisContent: TeamsAxisTooltipTrades }}
														sx={{
															'& .MuiChartsAxis-tickLabel': { fill: 'rgba(255,255,255,0.75)' },
															'& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: 'rgba(255,255,255,0.25)' },
															'& .MuiChartsLegend-series text': { fill: 'rgba(255,255,255,0.9) !important' },
															'& .MuiChartsGrid-line': { stroke: 'rgba(255,255,255,0.12)' },
														}}
													/>
												</Box>
											<Box>
												<Typography
													variant="caption"
													sx={{
														display: "block",
														mb: 0.75,
														color: "rgba(255,255,255,0.45)",
														fontWeight: 600,
														textTransform: "uppercase",
														letterSpacing: "0.06em",
													}}
												>
													Active Users (stacked)
												</Typography>
												<LineChart
													xAxis={[
														{
															scaleType: "point",
															data: chartXAxis,
															id: "x-active-users",
														},
													]}
													yAxis={[
														{
															valueFormatter: (value: number) =>
																Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : "",
															tickLabelStyle: {
																textAnchor: "start" as const,
																fill: "rgba(255,255,255,0.75)",
															},
														},
													]}
													series={chartSeriesActiveUsers}
													height={240}
													tooltip={{ trigger: "axis" }}
													slots={{ axisContent: TeamsAxisTooltipActiveUsers }}
													sx={{
														"& .MuiChartsAxis-tickLabel": { fill: "rgba(255,255,255,0.75)" },
														"& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: "rgba(255,255,255,0.25)" },
														"& .MuiChartsLegend-series text": { fill: "rgba(255,255,255,0.9) !important" },
														"& .MuiChartsGrid-line": { stroke: "rgba(255,255,255,0.12)" },
													}}
												/>
											</Box>
											</Box>
										</Box>
									</CardContent>
								</Card>
								</Box>
							</div>
					</Box>
				</LoadingOverlay>
			</Container>
		</main>
	);
};

export default Analyze;