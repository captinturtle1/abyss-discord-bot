export default function calculate_gas_range(interaction){
    const gweiPrices = [5, 10, 20, 50, 100, 250, 500, 1000, 2500, 5000];
    const gaslimit = interaction.options.getInteger('gas_limit');
    let costArray = [];

    for (let i = 0; i < gweiPrices.length; i++) {
        let cost = gweiPrices[i] * gaslimit / 1000000000;
        costArray[i] = (gweiPrices[i] + " gwei:\t" + "**" + cost + "**");
    }

    const costString = costArray.join("\r\n")

    interaction.reply({ content: `${costString}`, ephemeral: true });
};