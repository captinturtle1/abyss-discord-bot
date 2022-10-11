export default function calculate_gas_legacy(interaction){
    let gaslimit = interaction.options.getInteger('gas_limit');
    let gwei = interaction.options.getInteger('gwei');

    let cost = gwei * gaslimit / 1000000000;
    let finalCost = (gwei + " gwei:\t" + "**" + cost + "**").toString();

    interaction.reply({ content: `${finalCost}`, ephemeral: true });
};