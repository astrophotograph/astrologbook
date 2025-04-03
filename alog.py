import click

@click.group()
def cli():
    """A command-line tool with subcommands."""
    pass

@click.command()
@click.argument('name')
def greet(name):
    """Greet a user by name."""
    click.echo(f"Hello, {name}!")

@click.command()
@click.argument('x', type=int)
@click.argument('y', type=int)
def add(x, y):
    """Add two numbers."""
    result = x + y
    click.echo(f"The sum of {x} and {y} is {result}.")

@click.command()
@click.argument('x', type=int)
@click.argument('y', type=int)
def multiply(x, y):
    """Multiply two numbers."""
    result = x * y
    click.echo(f"The product of {x} and {y} is {result}.")

# Register the subcommands
cli.add_command(greet)
cli.add_command(add)
cli.add_command(multiply)

if __name__ == '__main__':
    cli()