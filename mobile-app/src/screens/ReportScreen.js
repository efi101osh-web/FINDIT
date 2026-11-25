import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Screen from '../components/Screen';
import ReportForm from '../components/ReportForm';
import Notice from '../components/Notice';
import { ErrorView, LoadingView } from '../components/StateViews';
import { useOptions } from '../hooks/useOptions';
import { useReportForm } from '../hooks/useReportForm';
import { createItem } from '../api/itemsApi';
import { buildCreateBody, emptyValues } from '../utils/itemValidation';
import { colors, spacing, typography } from '../theme';

/** The "Report" tab: a lost or found report. On success it opens the new report. */
export default function ReportScreen({ navigation, route }) {
  const { options, zones, loading, error } = useOptions();
  const form = useReportForm(emptyValues(route && route.params && route.params.reportType === 'FOUND' ? 'FOUND' : 'LOST'));
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState(null);

  // The Home buttons ("I lost something" / "I found something") choose the type.
  const requestedType = route && route.params && route.params.reportType;
  const { setField } = form;
  useEffect(() => {
    if (requestedType) setField('reportType', requestedType);
  }, [requestedType, setField]);

  async function submit() {
    setProblem(null);
    const found = form.check(zones);
    if (Object.keys(found).length > 0) {
      setProblem('Please fix the highlighted boxes.');
      return;
    }
    setSubmitting(true);
    try {
      const item = await createItem(buildCreateBody(form.values));
      form.reset(emptyValues(form.values.reportType));
      setSubmitting(false);
      navigation.navigate('ItemDetails', { id: item.id });
    } catch (failure) {
      setSubmitting(false);
      if (failure.details && failure.details.length > 0) {
        const fromServer = {};
        for (const detail of failure.details) fromServer[detail.field] = detail.message;
        form.setErrors(fromServer);
      }
      setProblem(failure.message || 'Could not save the report. Please try again.');
    }
  }

  if (loading) return <Screen><LoadingView message="Getting the form ready…" /></Screen>;
  if (error) return <Screen><ErrorView message={error.message} /></Screen>;

  return (
    <Screen scroll>
      <Text style={styles.heading}>Report an item</Text>
      <Text style={styles.lead}>The more clearly you describe it, the easier it is to match.</Text>
      <Notice message="Preview: reports you make now are kept on this phone only until the app is closed. Saving to the server comes in the next stage." />
      <ReportForm mode="create" values={form.values} errors={form.errors} setField={form.setField} zones={zones} options={options} onSubmit={submit} submitting={submitting} problem={problem} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.title, color: colors.text },
  lead: { ...typography.body, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
});
