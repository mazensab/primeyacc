from __future__ import annotations

from datetime import date

from django.core.management.base import BaseCommand, CommandError

from subscriptions.auto_renew import prepare_auto_renewals


class Command(BaseCommand):
    help = (
        'Prepare idempotent Mhamcloud subscription renewals. '
        'This command never charges a payment method automatically.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=int,
            default=None,
        )
        parser.add_argument(
            '--days-ahead',
            type=int,
            default=7,
        )
        parser.add_argument(
            '--date',
            dest='process_date',
            default='',
        )

    def handle(self, *args, **options):
        raw_date = str(options.get('process_date') or '').strip()
        process_date = None

        if raw_date:
            try:
                process_date = date.fromisoformat(raw_date)
            except ValueError as exc:
                raise CommandError(
                    '--date must use YYYY-MM-DD.'
                ) from exc

        days_ahead = int(options.get('days_ahead') or 0)

        if days_ahead < 0:
            raise CommandError('--days-ahead cannot be negative.')

        result = prepare_auto_renewals(
            today=process_date,
            days_ahead=days_ahead,
            company_id=options.get('company_id'),
        )

        self.stdout.write(f'EVALUATED={result.evaluated}')
        self.stdout.write(f'PREPARED={result.prepared}')
        self.stdout.write(f'EXISTING={result.existing}')
        self.stdout.write(f'SKIPPED={result.skipped}')

        for item in result.items:
            self.stdout.write(
                'ITEM '
                f'source_subscription_id={item.source_subscription_id} '
                f'renewal_subscription_id={item.renewal_subscription_id} '
                f'payment_id={item.payment_id or "none"} '
                f'gateway={item.gateway or "none"} '
                f'created_subscription={item.created_subscription} '
                f'created_payment={item.created_payment}'
            )

        self.stdout.write(
            self.style.SUCCESS('AUTO_RENEW_PREPARATION=PASS')
        )
