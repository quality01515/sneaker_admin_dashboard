import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { truncateAddress } from "src/utils";

type SolscanType = "account" | "token";

interface AddressDisplayProps {
  address: string | null | undefined;
  /** Show copy button (default true) */
  showCopy?: boolean;
  /** Show Solscan link - pass "account" or "token" (default "account") */
  showSolscan?: SolscanType | false;
  /** Callback when copy is clicked (default uses clipboard) */
  onCopy?: (address: string) => void;
  /** First N chars to show (default 4) */
  first?: number;
  /** Last N chars to show (default 4) */
  last?: number;
  /** Custom class name for the text container */
  className?: string;
  /** MUI sx for the root Box */
  sx?: Record<string, unknown>;
  /** Typography variant (default "body2") */
  variant?: "body2" | "body1" | "inherit";
  /** Fallback when address is empty (default "—") */
  fallback?: string;
}

export const AddressDisplay = ({
  address,
  showCopy = true,
  showSolscan = "account",
  onCopy,
  first = 4,
  last = 4,
  className,
  sx,
  variant = "body2",
  fallback = "—",
}: AddressDisplayProps) => {
  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      onCopy?.(address);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!address || address.trim() === "") {
    return <>{fallback}</>;
  }

  const solscanUrl =
    showSolscan === "token"
      ? `https://solscan.io/token/${address}`
      : `https://solscan.io/account/${address}`;

  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 0.5, ...sx }}
      className={className}
    >
      <Tooltip title={address}>
        <Typography
          component="span"
          variant={variant}
          sx={{ fontFamily: "monospace", fontWeight: 500 }}
        >
          {truncateAddress(address, first, last)}
        </Typography>
      </Tooltip>
      {showCopy && (
        <Tooltip title="Copy address">
          <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {showSolscan && (
        <Tooltip title="View on Solscan">
          <IconButton
            size="small"
            component="a"
            href={solscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ p: 0.25 }}
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};
