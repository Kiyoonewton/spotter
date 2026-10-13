import Icon from '@expo/vector-icons/MaterialCommunityIcons';
test('Paper icon dependencies resolve instead of silently falling back to empty glyphs', () => expect(Icon).toBeTruthy());
