import { StyleSheet, Text, View } from 'react-native';
import TextField from './TextField';
import SelectField from './SelectField';
import ChoiceChips from './ChoiceChips';
import DateField from './DateField';
import SwitchRow from './SwitchRow';
import Button from './Button';
import Notice from './Notice';
import { CATEGORY_LABELS, COLOUR_LABELS, TIME_BAND_LABELS, labelFor } from '../utils/labels';
import { detailRule } from '../utils/place';
import { colors, spacing, typography } from '../theme';

const asOptions = (codes, labels) => (codes || []).map((code) => ({ value: code, label: labelFor(labels, code) }));

/**
 * The lost / found report form, used to create a report and to edit one.
 * It holds no data itself: the screen owns `values` and `errors` (see hooks/useReportForm).
 *   mode "create": the person can choose Lost or Found.
 *   mode "edit":   the type is fixed (the server never lets it change).
 */
export default function ReportForm({ mode = 'create', values, errors, setField, zones, options, onSubmit, submitting, problem, submitLabel }) {
  const lost = values.reportType === 'LOST';
  const rule = detailRule(zones, values.generalLocation);
  const zoneOptions = (zones || []).map((zone) => ({ value: zone.code, label: zone.label }));

  return (
    <View>
      {mode === 'create' ? (
        <ChoiceChips
          label="What happened?"
          value={values.reportType}
          onChange={(type) => setField('reportType', type)}
          options={[
            { value: 'LOST', label: 'I lost something' },
            { value: 'FOUND', label: 'I found something' },
          ]}
        />
      ) : null}

      {!lost ? <Notice message="Please hand found items to the authorised office. FINDIT never arranges private exchanges." /> : null}
      {problem ? <Notice tone="error" message={problem} /> : null}

      <TextField label="Item name" value={values.title} onChangeText={(text) => setField('title', text)} error={errors.title} placeholder="For example: Black wireless headphones" autoCapitalize="sentences" />
      <SelectField label="Category" value={values.category} options={asOptions(options && options.categories, CATEGORY_LABELS)} onChange={(code) => setField('category', code)} error={errors.category} />
      <SelectField label="Colour" value={values.colour} options={asOptions(options && options.colours, COLOUR_LABELS)} onChange={(code) => setField('colour', code)} error={errors.colour} />
      <TextField
        label="Description"
        value={values.description}
        onChangeText={(text) => setField('description', text)}
        error={errors.description}
        helper={'Describe it in general terms. Put marks only the owner would know in "Private details" below.'}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        inputStyle={styles.multiline}
      />
      <TextField label="Brand (optional)" value={values.brand} onChangeText={(text) => setField('brand', text)} error={errors.brand} />

      <SelectField
        label={lost ? 'Where do you think you lost it?' : 'Where did you find it?'}
        value={values.generalLocation}
        options={zoneOptions}
        onChange={(code) => setField('generalLocation', code)}
        error={errors.generalLocation}
        helper="It is only a hint, because items get moved."
        placeholder="Choose the area"
      />
      {rule && rule.mode === 'LIST' ? (
        <SelectField
          label={rule.hint}
          value={values.locationDetail || null}
          options={rule.options.map((name) => ({ value: name, label: name }))}
          onChange={(name) => setField('locationDetail', name)}
          error={errors.locationDetail}
        />
      ) : null}
      {rule && rule.mode !== 'LIST' ? (
        <TextField
          label={rule.mode === 'REQUIRED_TEXT' ? 'More about the place' : 'More about the place (optional)'}
          value={values.locationDetail}
          onChangeText={(text) => setField('locationDetail', text)}
          error={errors.locationDetail}
          helper={rule.hint}
        />
      ) : null}

      <DateField label={lost ? 'When did you lose it?' : 'When did you find it?'} value={values.dateOccurred} onChange={(date) => setField('dateOccurred', date)} error={errors.dateOccurred} />
      <ChoiceChips label="Time of day (optional)" value={values.approximateTime} onChange={(band) => setField('approximateTime', band)} options={asOptions(options && options.timeBands, TIME_BAND_LABELS)} />

      <View style={styles.privateBox}>
        <Text style={styles.privateTitle}>Private</Text>
        <Text style={styles.privateNote}>Only you and administrators can see these. They are never shown to other people or found by search.</Text>
        <TextField
          label="Private details (optional)"
          value={values.privateDetails}
          onChangeText={(text) => setField('privateDetails', text)}
          error={errors.privateDetails}
          helper="Marks, contents or anything only the real owner would know."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          inputStyle={styles.multiline}
        />
        {!lost ? (
          <>
            <SwitchRow label="I handed it to an authorised office" value={Boolean(values.handedToOffice)} onValueChange={(on) => setField('handedToOffice', on)} />
            <TextField label="Where is it kept? (optional)" value={values.privateStorageLocation} onChangeText={(text) => setField('privateStorageLocation', text)} error={errors.privateStorageLocation} />
          </>
        ) : null}
      </View>

      <Button title={submitLabel || (mode === 'edit' ? 'Save changes' : 'Submit report')} onPress={onSubmit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  multiline: { minHeight: 96, paddingTop: spacing.sm },
  // white, not light purple: grey helper text on light purple is below the readable contrast (ARCHITECTURE.md section 12)
  privateBox: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.xl },
  privateTitle: { ...typography.heading, color: colors.text },
  privateNote: { ...typography.small, color: colors.text, marginTop: spacing.xs, marginBottom: spacing.lg },
});
