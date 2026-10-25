
interface Props_N {
	value: number;
}

export const FormattedNumber: React.FC<Props_N> = ({ value }) => {
	if (value >= 0.01) {
		return (
			<span className="text-white font-medium">
				{`${value.toFixed(2)}`}
			</span>
		);
	}

	const str = value.toString();
	const decimal = str.split('.')[1] || '';

	// Count leading zeros
	const match = decimal.match(/^0+/);
	const leadingZeros = match ? match[0].length : 0;

	// Get up to 6 significant digits after leading zeros
	const sigDigits = decimal.slice(leadingZeros).slice(0, 3);

	const prefix = `0.0`;
	const suffix = sigDigits;

	return (
		<span className="text-white">
			{prefix}
			{leadingZeros > 0 && (
				<sub className="text-[10px] align-sub font-normal">{leadingZeros}</sub>
			)}
			<span className="font-semibold tracking-tight">{suffix}</span>
		</span>
	);
};
