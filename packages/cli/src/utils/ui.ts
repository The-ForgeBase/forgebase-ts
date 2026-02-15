import figlet from 'figlet';
import inquirer from 'inquirer';
import chalk from 'chalk';

export function showBanner(commandName: string, description: string) {
  console.log('');
  console.log(
    chalk.hex('#FF5733')(
      figlet.textSync('ForgeBase CLI', { horizontalLayout: 'full' }),
    ),
  );
  console.log('');
  console.log(chalk.bold.cyan(`Command: ${commandName}`));
  console.log(chalk.gray(description));
  console.log(chalk.gray('--------------------------------------------------'));
  console.log('');
}

export async function confirmAction(
  message: string,
  skip: boolean,
): Promise<boolean> {
  if (skip) {
    return true;
  }

  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: message,
      default: true,
    },
  ]);

  return proceed;
}
